// Shape of the collection ("lookbook") data rendered by the catalog components.
//
// These interfaces previously lived in `lib/mockCollections.ts` alongside a
// hardcoded `collectionDetails` fixture. That file was deleted in f64bc48, when
// collections moved to Convex (`customerHome.getAllCollections` and
// `customerHome.getCollection`) — but the five components that imported its
// *types* were never repointed, so they have been importing a module that does
// not exist.
//
// Only the type declarations are restored here. The mock data is deliberately
// not: collections are real Convex documents now, and reintroducing a fixture
// would give the catalog a second, competing source of truth.

/**
 * A collection as rendered in a grid card.
 *
 * `CollectionCard` widens this inline with the presentation-only fields the
 * index page attaches (`badge`, `locality`, `tagline`, …), so the optional
 * members below are the ones Convex may legitimately omit.
 */
export interface Collection {
  slug: string;
  title: string;
  /** Occasion id this collection maps onto. */
  label: string;
  icon: string;
  description: string;
  longDescription: string;
  imageUrl: string;
  productCount: number;
  isFeatured?: boolean;
}

export interface FeaturedBoutiqueRef {
  id: string;
  name: string;
  imageUrl: string;
  verified: boolean;
}

export interface FeaturedProductRef {
  id: string;
  name: string;
  imageUrl: string;
  price: number;
  boutiqueName: string;
}

/**
 * Rich editorial shape for a full collection page.
 *
 * `CollectionHeader` accepts this as an optional `details` prop, but its only
 * live caller (`CollectionPageClient`) passes the individual fields instead —
 * so in practice this type is currently used by the editorial components
 * (`CollectionHero`, `CollectionStats`, `CollectionShowcase`), none of which
 * are rendered anywhere today.
 */
export interface CollectionDetails extends Collection {
  /** Short marketing subtitle shown in the hero. */
  subtitle: string;
  /** Full editorial copy. */
  editorialCopy: string;
  /** Accent hex colour used for subtle tints. */
  accentColor: string;
  /** Widescreen 16:9 cover image. */
  coverImageUrl: string;
  stats: {
    productCount: number;
    boutiqueCount: number;
    sameDayEligible: number;
    averageRating: number;
  };
  featuredBoutiques: FeaturedBoutiqueRef[];
  featuredProducts: FeaturedProductRef[];
  /** Editorial tags shown as chips. */
  tags: string[];
}
