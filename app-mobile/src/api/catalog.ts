import { apiClient } from './client';
import { fetchMultipart } from './client';

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

export interface VitrinaOut {
  slug: string | null;
  bio: string | null;
  profile_image_url: string | null;
  vitrina_active: boolean;
  vitrina_url: string | null;
  services: CatalogService[];
}

export async function getVitrina(): Promise<VitrinaOut> {
  const res = await apiClient.get<VitrinaOut>('/v1/catalog');
  return res.data;
}

export async function activateVitrina(active: boolean): Promise<{ vitrina_active: boolean; slug: string | null; vitrina_url: string | null }> {
  const res = await apiClient.post('/v1/catalog/activate', { active });
  return res.data;
}

export async function updateProfile(
  bio: string | null,
  profileImage?: { uri: string; type: string; name: string },
): Promise<{ bio: string; profile_image_url: string }> {
  const form = new FormData();
  if (bio !== null) form.append('bio', bio);
  if (profileImage) {
    form.append('profile_image', {
      uri: profileImage.uri,
      type: profileImage.type,
      name: profileImage.name,
    } as any);
  }
  // Fix FORMDATA-XHR-RN: usar fetch() nativo en vez de axios/XHR para FormData
  return fetchMultipart('/v1/catalog/profile', 'PUT', form);
}

export async function createService(data: {
  name: string;
  price: number;
  description?: string;
  position?: number;
  image?: { uri: string; type: string; name: string };
}): Promise<CatalogService> {
  const form = new FormData();
  form.append('name', data.name);
  form.append('price', String(data.price));
  if (data.description) form.append('description', data.description);
  if (data.position) form.append('position', String(data.position));
  if (data.image) {
    form.append('image', {
      uri: data.image.uri,
      type: data.image.type,
      name: data.image.name,
    } as any);
  }
  return fetchMultipart('/v1/catalog/services', 'POST', form);
}

export async function updateService(
  id: string,
  data: {
    name?: string;
    price?: number;
    description?: string;
    active?: boolean;
    position?: number;
    image?: { uri: string; type: string; name: string };
  },
): Promise<CatalogService> {
  const form = new FormData();
  if (data.name !== undefined) form.append('name', data.name);
  if (data.price !== undefined) form.append('price', String(data.price));
  if (data.description !== undefined) form.append('description', data.description);
  if (data.active !== undefined) form.append('active', String(data.active));
  if (data.position !== undefined) form.append('position', String(data.position));
  if (data.image) {
    form.append('image', {
      uri: data.image.uri,
      type: data.image.type,
      name: data.image.name,
    } as any);
  }
  return fetchMultipart(`/v1/catalog/services/${id}`, 'PUT', form);
}

export async function deleteService(id: string): Promise<void> {
  await apiClient.delete(`/v1/catalog/services/${id}`);
}
