import Image from "next/image";

export default function SimpleFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto m-1 md:mx-8 md:mb-4 py-3 md:px-6 px-3 rounded-xl border-t backdrop-blur-sm transition-all duration-300 bg-white/80 border-gray-100 text-gray-400 shadow-xl shadow-slate-200/50 dark:bg-[#131417]/50 dark:border-gray-800 dark:text-gray-500 dark:shadow-black/30">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 mx-auto">
        {/* Left: Brand + copyright */}
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1 sm:gap-2 text-sm sm:text-md text-black/80 dark:text-white/80">
          <span className="opacity-60">© {currentYear}</span>
          <span className="font-medium">Growthpad Consulting Group.</span>
          <span className="opacity-60 text-xs sm:text-sm flex items-center gap-1">
            Made with ♡ in
            <span className="relative inline-block group">
              <span className="cursor-default">Nairobi</span>
              <span className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 scale-90 transition-all duration-300 ease-out group-hover:-top-7 group-hover:opacity-100 group-hover:scale-100">
                <Image src="/assets/images/kenya.gif" alt="Nairobi Flag" width={20} height={20} className="w-5 h-5 rounded-sm shadow" unoptimized />
              </span>
            </span>
            x
            <span className="relative inline-block group">
              <span className="cursor-default">Accra</span>
              <span className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 scale-90 transition-all duration-300 ease-out group-hover:-top-7 group-hover:opacity-100 group-hover:scale-100">
                <Image src="/assets/images/ghana.gif" alt="Accra Flag" width={20} height={20} className="w-5 h-5 rounded-sm shadow" unoptimized />
              </span>
            </span>
          </span>
        </div>

        {/* Right: Links */}
        <div className="flex items-center gap-3 sm:gap-6">
          <div className="hidden sm:block h-3 w-[1px] bg-gray-200 dark:bg-gray-800" />

          <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm font-bold">
            <a href="mailto:support@growthpad.co.ke" className="hover:text-[#f05d23] dark:hover:text-[#f05d23] transition-colors">
              Support
            </a>
            <a href="https://growthpad.co.ke" target="_blank" rel="noopener noreferrer" className="hover:text-[#f05d23] dark:hover:text-[#f05d23] transition-colors">
              Website
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
