import Link from "next/link";
import Image from "next/image";

function MenuCard({
  id,
  name,
  price,
  imageUrl,
  note,
  basePath = ""
}: {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
  note?: string;
  basePath?: string;
}) {
  return (
    <Link href={`/${basePath}/${encodeURIComponent(id)}`} className="shrink-0">
      <div className="w-64 bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden hover:shadow-sm transition-shadow">
        <div className="relative w-full h-48 overflow-hidden">
          <Image
            src={
              imageUrl && imageUrl.length > 0
                ? imageUrl
                : '/assets/sample_menu.png'
            }
            alt={name}
            fill
            className="object-cover"
          />
        </div>

        <div className="px-4 py-3">
          <p className="text-[14px] text-gray-800 font-medium leading-snug line-clamp-2 min-h-10">
            {name}
          </p>

          {note && (
            <p className="text-[11px] text-gray-400 mt-1 line-clamp-2">
              {note}
            </p>
          )}

          <p className="text-[15px] font-bold text-gray-900 mt-3">
            ₱{price}.00
          </p>
        </div>
      </div>
    </Link>
  );
}

export default MenuCard;