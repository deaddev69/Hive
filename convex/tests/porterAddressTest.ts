import {
  buildCustomerPorterAddress,
  buildBoutiquePorterAddress,
  assertPorterAddressUsable,
  toPorterPhone,
} from "../lib/porterAddress";

/**
 * Regression tests for the address block Hive hands to Porter.
 *
 * The bug these guard against: every customer address in production comes from
 * the map picker, which leaves `line1` and `line2` empty and puts the street in
 * `formattedAddress`, the door number in `houseNumber` and the landmark in
 * `landmark`. Two booking paths read `line1` alone, so Porter received a blank
 * street address and nothing but a map pin, and the door number never reached
 * the `apartment_address` field from any path at all.
 */
export function runPorterAddressTests() {
  let passed = 0;
  let failed = 0;

  function check(name: string, actual: unknown, expected: unknown) {
    const a = JSON.stringify(actual);
    const e = JSON.stringify(expected);
    if (a === e) {
      passed++;
      console.log(`[PASS] ${name}`);
    } else {
      failed++;
      console.error(`[FAIL] ${name}\n         expected ${e}\n         got      ${a}`);
    }
  }

  function throws(name: string, fn: () => unknown) {
    try {
      fn();
      failed++;
      console.error(`[FAIL] ${name}\n         expected a throw, got none`);
    } catch {
      passed++;
      console.log(`[PASS] ${name}`);
    }
  }

  // ── A real production address (map picker, no line1/line2) ────────────────
  const mapPicked = {
    label: "Home",
    line1: undefined,
    line2: undefined,
    formattedAddress: "Data Tower, Infopark Rd, Kalappurakkal, Kakkanad, Kerala 682030, India",
    houseNumber: "4B",
    landmark: "Madathiparambil House",
    city: "Kakkanad",
    state: "Kerala",
    pincode: "682030",
    lat: 10.0155603,
    lng: 76.3564725,
    phone: "+918075769986",
  };

  const drop = buildCustomerPorterAddress(mapPicked, "Athul Krishna");

  check("Door number goes to apartment_address", drop.apartment_address, "4B");
  // The customer's own landmark leads: `formattedAddress` here names Data
  // Tower, an office block, because reverse geocoding returns the nearest
  // prominent place rather than a house. A rider following that line drove to
  // the office block on a real delivery.
  check("The customer's landmark leads the street line", drop.street_address1, "Madathiparambil House");
  check("The geocoded guess drops to the supporting line", drop.street_address2, mapPicked.formattedAddress);
  check("Landmark is still sent in its own field", drop.landmark, "Madathiparambil House");
  check("City survives", drop.city, "Kakkanad");
  check("State survives", drop.state, "Kerala");
  check("Pincode survives", drop.pincode, "682030");
  check("Country is always India", drop.country, "India");
  check("Latitude survives", drop.lat, 10.0155603);
  check("Longitude survives", drop.lng, 76.3564725);
  check("Contact name survives", drop.contact_details.name, "Athul Krishna");
  check("Phone is normalised to +91", drop.contact_details.phone_number, "+918075769986");

  // ── Manually typed address (line1/line2 present) ─────────────────────────
  const typed = {
    line1: "Sona Towers, 71 Millers Road",
    line2: "Krishna Nagar Industrial Area",
    formattedAddress: "Sona Towers, Bengaluru, Karnataka 560029, India",
    houseNumber: "27",
    landmark: "Hosur Road",
    city: "Bengaluru",
    state: "Karnataka",
    pincode: "560029",
    lat: 12.935025,
    lng: 77.6092,
    phone: "9876543210",
  };

  const typedDrop = buildCustomerPorterAddress(typed, "Customer");
  check("line1 wins as the street line when present", typedDrop.street_address1, typed.line1);
  check("line2 stays the supporting line", typedDrop.street_address2, typed.line2);
  check("Door number still reaches apartment_address", typedDrop.apartment_address, "27");

  // ── Half-filled address: line1 present, line2 missing ────────────────────
  const halfTyped = buildCustomerPorterAddress({ ...typed, line2: undefined }, "Customer");
  check(
    "formattedAddress backfills the second line when line2 is missing",
    halfTyped.street_address2,
    typed.formattedAddress
  );

  // ── The old shadowing bug: line2 must not push out houseNumber ───────────
  check(
    "Door number is not lost when line2 is also present",
    buildCustomerPorterAddress(typed, "Customer").apartment_address,
    "27"
  );

  // ── Empty strings are treated as absent, not sent as "" ──────────────────
  const sparse = buildCustomerPorterAddress(
    {
      line1: "   ",
      line2: "",
      formattedAddress: "Ernakulam South, Kochi, Kerala 682016, India",
      houseNumber: "",
      landmark: "   ",
      city: "Kochi",
      state: "Kerala",
      pincode: "682016",
      lat: 9.9692376,
      lng: 76.2909866,
      phone: "8921066120",
    },
    "Customer"
  );
  check("Blank house number is omitted", "apartment_address" in sparse, false);
  check("Blank landmark is omitted", "landmark" in sparse, false);
  check("Blank second line is omitted", "street_address2" in sparse, false);
  check(
    "Whitespace line1 falls through to formattedAddress",
    sparse.street_address1,
    "Ernakulam South, Kochi, Kerala 682016, India"
  );

  // ── A typed street with no reverse-geocoded string keeps its area ────────
  // This is the shape a real customer produced: line1 typed by hand, an empty
  // formattedAddress, and the area only in `locality`.
  const typedNoFormatted = buildCustomerPorterAddress(
    {
      line1: "Surabhi Nagar",
      formattedAddress: "",
      houseNumber: "Ramakrishna Mens PG, Room 411",
      landmark: "Near alakapuri hotel kakkanad ",
      locality: "Kakkanad",
      city: "Kochi",
      state: "Kerala",
      pincode: "682030",
      lat: 10.016347879521431,
      lng: 76.34654210251905,
      phone: "9605365913",
    },
    "Customer"
  );
  check("Typed street stays the first line", typedNoFormatted.street_address1, "Surabhi Nagar");
  check("Locality backs up an empty formattedAddress", typedNoFormatted.street_address2, "Kakkanad");
  check(
    "A long door description still reaches apartment_address",
    typedNoFormatted.apartment_address,
    "Ramakrishna Mens PG, Room 411"
  );
  check("A trailing space is trimmed off the landmark", typedNoFormatted.landmark, "Near alakapuri hotel kakkanad");

  // ── A map-picked address with NO landmark still uses the geocode ─────────
  const noLandmark = buildCustomerPorterAddress(
    { ...mapPicked, landmark: undefined },
    "Customer"
  );
  check(
    "With no landmark the geocoded string leads",
    noLandmark.street_address1,
    mapPicked.formattedAddress
  );
  check(
    "And the locality supports it",
    noLandmark.street_address2,
    undefined
  );

  // ── A hand-typed street always beats both ────────────────────────────────
  const typedBeatsLandmark = buildCustomerPorterAddress(
    { ...typed, line2: undefined },
    "Customer"
  );
  check(
    "A typed line1 outranks the customer's landmark",
    typedBeatsLandmark.street_address1,
    typed.line1
  );
  check(
    "The landmark still rides in its own field",
    typedBeatsLandmark.landmark,
    typed.landmark
  );

  // ── The same line is never sent twice ────────────────────────────────────
  const duplicated = buildCustomerPorterAddress(
    {
      line1: "S Janatha Rd, Kaloor, Kochi",
      formattedAddress: "S Janatha Rd, Kaloor, Kochi",
      city: "Kochi",
      state: "Kerala",
      pincode: "682017",
      lat: 9.9923694,
      lng: 76.3039379,
      phone: "9747657294",
    },
    "Customer"
  );
  check("Identical street lines are not duplicated", "street_address2" in duplicated, false);

  // ── Phone normalisation ──────────────────────────────────────────────────
  check("Bare 10-digit phone", toPorterPhone("8075769986"), "+918075769986");
  check("Phone already carrying 91", toPorterPhone("919747657294"), "+919747657294");
  check("Phone with +91 and spaces", toPorterPhone("+91 80757 69986"), "+918075769986");
  check("Too-short phone yields empty, not a fake number", toPorterPhone("12345"), "");
  check("Missing phone yields empty", toPorterPhone(undefined), "");

  // ── Boutique end of the trip ─────────────────────────────────────────────
  const boutique = {
    boutiqueName: "SILOHA",
    address: "SILOHA 34/657A, SMRA -52, St Martin Rd, Palarivattom, Kochi, Kerala 682025, India",
    city: "Palarivattom",
    state: "Kerala",
    pincode: "682025",
    latitude: 9.9994391,
    longitude: 76.3042105,
    phone: "918075769986",
    addressDetails: {
      line1: "SILOHA 34/657A, SMRA -52, St Martin Rd, Palarivattom, Kochi, Kerala 682025, India",
      city: "Palarivattom",
      state: "Kerala",
      pincode: "682025",
      lat: 9.9994391,
      lng: 76.3042105,
    },
  };

  const pickup = buildBoutiquePorterAddress(boutique);
  check(
    "Boutique street line comes from the structured record",
    pickup.street_address1,
    boutique.addressDetails.line1
  );
  check("Boutique line is not repeated as line 2", "street_address2" in pickup, false);
  check("Boutique city survives", pickup.city, "Palarivattom");
  check("Boutique pincode survives", pickup.pincode, "682025");
  check("Boutique coordinates survive", [pickup.lat, pickup.lng], [9.9994391, 76.3042105]);
  check("Boutique name becomes the contact", pickup.contact_details.name, "SILOHA");
  check("Boutique phone is normalised", pickup.contact_details.phone_number, "+918075769986");

  // Legacy boutique with only the flat address string.
  const legacy = buildBoutiquePorterAddress({
    boutiqueName: "VelvetVine Boutique",
    address: "Shobha Road,Kaloor",
    city: "Kochi",
    state: "Kerala",
    pincode: "682025",
    latitude: 10.0007936,
    longitude: 76.3133952,
    phone: "8075769986",
  });
  check("Legacy flat address is used as the street line", legacy.street_address1, "Shobha Road,Kaloor");

  // Coordinates recorded only on addressDetails still reach Porter.
  const detailsOnlyCoords = buildBoutiquePorterAddress({
    boutiqueName: "New",
    address: "Ernakulam South, Kochi, Kerala 682016, India",
    latitude: 0,
    longitude: 0,
    phone: "9747657294",
    addressDetails: {
      line1: "Ernakulam South, Kochi, Kerala 682016, India",
      city: "Ernakulam South",
      state: "Kerala",
      pincode: "682016",
      lat: 9.9692376,
      lng: 76.2909866,
    },
  });
  check(
    "Coordinates fall back to the structured record",
    [detailsOnlyCoords.lat, detailsOnlyCoords.lng],
    [9.9692376, 76.2909866]
  );
  check("City falls back to the structured record", detailsOnlyCoords.city, "Ernakulam South");

  // ── Refuse to book an unusable trip ──────────────────────────────────────
  throws("A drop with no coordinates is rejected", () =>
    assertPorterAddressUsable(
      buildCustomerPorterAddress({ ...mapPicked, lat: 0, lng: 0 }, "Customer"),
      "drop"
    )
  );
  throws("A drop with no reachable phone is rejected", () =>
    assertPorterAddressUsable(
      buildCustomerPorterAddress({ ...mapPicked, phone: "" }, "Customer"),
      "drop"
    )
  );
  throws("A boutique with no coordinates is rejected", () =>
    assertPorterAddressUsable(
      buildBoutiquePorterAddress({ boutiqueName: "X", address: "Somewhere", phone: "9747657294" }),
      "pickup"
    )
  );

  let complete = true;
  try {
    assertPorterAddressUsable(drop, "drop");
    assertPorterAddressUsable(pickup, "pickup");
  } catch {
    complete = false;
  }
  check("A complete real address passes the guard", complete, true);

  console.log(`\nPorter addresses: ${passed} passed, ${failed} failed.`);
  return { passed, failed };
}

// Run immediately if executed via tsx, matching convex/tests/signatureTest.ts.
if (typeof process !== "undefined" && process.argv && process.argv[1]?.includes("porterAddressTest")) {
  const { failed } = runPorterAddressTests();
  if (failed > 0) process.exit(1);
}
