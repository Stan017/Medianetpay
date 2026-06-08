export interface CatalogService {
  id: string;
  merchant_id: string;
  name: string;
  description: string | null;
  price: string;
  image_url: string | null;
  payment_link_token: string | null;
  position: number;
  active: boolean;
  created_at: string;
}

export interface VitrinaData {
  slug: string | null;
  bio: string | null;
  profile_image_url: string | null;
  vitrina_active: boolean;
  vitrina_url: string | null;
  services: CatalogService[];
}
