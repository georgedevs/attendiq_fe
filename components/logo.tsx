import { GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo-dark.svg";
import Image from "next/image";
export function Logo({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div
      className={cn("flex py-4 items-center gap-2", collapsed && "justify-center")}
    >
      {!collapsed && (
          <Image src="/logo-dark.svg" alt="Logo" width={200} height={200} />
      )}


    </div>
  );
}
