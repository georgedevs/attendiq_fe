import { GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";
export function Logo({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div
      className={cn("flex py-4 items-center gap-2", collapsed && "justify-center")}
    >
      {!collapsed && (
          <Image src="/logo.svg" alt="Logo" className="w-[160px] md:w-[200px]" width={180} height={180} />
      )}


    </div>
  );
}
