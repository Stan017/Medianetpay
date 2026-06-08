import type { Metadata } from "next";
import { notFound } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface Service {
  id: string;
  name: string;
  description: string | null;
  price: string;
  image_url: string | null;
  payment_link_token: string;
}

interface VitrinaData {
  slug: string;
  business_name: string;
  bio: string | null;
  profile_image_url: string | null;
  services: Service[];
}

async function getVitrina(slug: string): Promise<VitrinaData | null> {
  try {
    const res = await fetch(`${API_BASE}/v1/public/vitrina/${slug}`, {
      next: { revalidate: 900 }, // caché 15 min en Cloudflare
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await getVitrina(slug);
  if (!data) return { title: "Vitrina no encontrada — MediaNetPay" };

  return {
    title: `${data.business_name} — MediaNetPay`,
    description: data.bio ?? `Servicios y cobros de ${data.business_name} vía MediaNetPay`,
    openGraph: {
      title: data.business_name,
      description: data.bio ?? `Paga fácil con MediaNetPay`,
      images: data.profile_image_url ? [data.profile_image_url] : [],
      type: "website",
    },
    twitter: {
      card: "summary",
      title: data.business_name,
      description: data.bio ?? "",
    },
  };
}

export default async function VitrinaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getVitrina(slug);
  if (!data) notFound();

  return (
    <div className="min-h-screen bg-[#f0f4f8] flex flex-col items-center py-10 px-4">
      {/* Header del negocio */}
      <div className="w-full max-w-md bg-white rounded-3xl shadow-sm p-6 mb-6 text-center">
        {data.profile_image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={data.profile_image_url}
            alt={data.business_name}
            className="w-24 h-24 rounded-2xl object-cover mx-auto mb-4 shadow"
          />
        )}
        {!data.profile_image_url && (
          <div className="w-24 h-24 rounded-2xl bg-[#003358] flex items-center justify-center mx-auto mb-4 shadow">
            <span className="text-white text-3xl font-bold">
              {data.business_name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <h1 className="text-2xl font-bold text-[#003358]">{data.business_name}</h1>
        {data.bio && (
          <p className="text-sm text-gray-500 mt-2 leading-relaxed">{data.bio}</p>
        )}
        <div className="mt-4 inline-flex items-center gap-1.5 text-xs text-gray-400">
          <span>Pagos seguros con</span>
          <span className="font-bold text-[#F89937]">MediaNetPay</span>
        </div>
      </div>

      {/* Servicios */}
      <div className="w-full max-w-md space-y-3">
        {data.services.length === 0 && (
          <div className="bg-white rounded-2xl p-8 text-center text-gray-400">
            <p className="text-sm">Este comercio aún no tiene servicios disponibles.</p>
          </div>
        )}

        {data.services.map((service) => (
          <a
            key={service.id}
            href={`${API_BASE}/pay/${service.payment_link_token}`}
            className="block bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden group"
          >
            <div className="flex items-center gap-4 p-4">
              {service.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={service.image_url}
                  alt={service.name}
                  className="w-16 h-16 rounded-xl object-cover shrink-0"
                />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-[#f0f4f8] flex items-center justify-center shrink-0">
                  <span className="text-2xl">🛍️</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[#003358] text-base leading-tight truncate">
                  {service.name}
                </p>
                {service.description && (
                  <p className="text-xs text-gray-400 mt-1 line-clamp-2">{service.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-lg font-bold text-[#16a34a]">
                  ${parseFloat(service.price).toFixed(2)}
                </span>
                <div className="w-8 h-8 rounded-full bg-[#F89937] flex items-center justify-center group-hover:bg-[#003358] transition-colors">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          </a>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-10 text-center">
        <p className="text-xs text-gray-400">
          ¿Eres comerciante?{" "}
          <a href="/register" className="text-[#F89937] font-medium hover:underline">
            Crea tu vitrina gratis
          </a>
        </p>
      </div>
    </div>
  );
}
