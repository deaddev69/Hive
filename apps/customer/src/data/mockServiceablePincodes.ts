export const mockServiceablePincodes = [
  "682030", // Kochi Central
  "682021", // Kochi West
  "688524", // Alappuzha region
  "683101", // Aluva/Kochi North
  "500034", // Hyderabad Banjara Hills
  "500081", // Hyderabad Hitech City
  "500032", // Hyderabad Gachibowli
];

export const isPincodeServiceable = (pincode: string): boolean => {
  return mockServiceablePincodes.includes(pincode.trim());
};
