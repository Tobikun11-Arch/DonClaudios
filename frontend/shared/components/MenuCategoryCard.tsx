'use client';

import Image from 'next/image';

const CATEGORY_PLACEHOLDER = '/assets/category_placeholder.svg';

function MenuCategoryCard({
  label,
  imageUrl,
  active,
  onClick
}: {
  label: string;
  imageUrl?: string | null;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        'shrink-0 w-[100px] flex flex-col items-center gap-1 px-2 pt-2 pb-2.5 rounded-2xl transition-colors ' +
        (active
          ? 'bg-[#fbd897] ring-2 ring-[#2d4a35]'
          : 'bg-white border border-gray-200 hover:bg-gray-50')
      }
    >
      <div className="w-full h-[70px] rounded-xl overflow-hidden bg-gray-100">
        <Image
          src={
            imageUrl && imageUrl.length > 0
              ? imageUrl
              : CATEGORY_PLACEHOLDER
          }
          alt={label}
          width={96}
          height={70}
          className="w-full h-full object-cover"
        />
      </div>

      <span
        title={label}
        className={
          'w-full text-center text-[12px] leading-tight truncate ' +
          (active
            ? 'text-[#2d4a35] font-bold'
            : 'text-gray-700 font-medium')
        }
      >
        {label}
      </span>
    </button>
  );
}

export default MenuCategoryCard;