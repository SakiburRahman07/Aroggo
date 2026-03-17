import QRCode from "qrcode";
import { cn } from "@/lib/utils";

type QrCodeProps = {
  value: string;
  size?: number;
  className?: string;
};

export async function QrCode({ value, size = 224, className }: QrCodeProps) {
  const svg = await QRCode.toString(value, {
    type: "svg",
    width: size,
    margin: 1,
    errorCorrectionLevel: "M",
    color: {
      dark: "#0f172a",
      light: "#ffffff"
    }
  });

  return (
    <div
      aria-label="QR code"
      className={cn("inline-flex rounded-[28px] bg-white p-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)]", className)}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
