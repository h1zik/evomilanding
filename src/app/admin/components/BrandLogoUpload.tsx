import { MAX_UPLOAD_MB } from "@/content/uploadConfig";
import { ImageUploadField } from "./ImageUploadField";

export function BrandLogoUpload({
  logoUrl,
  brandName,
  onChange,
  label = "Logo brand",
  hint,
  uploadPrefix = "brand",
}: {
  logoUrl: string;
  brandName: string;
  onChange: (url: string) => void;
  label?: string;
  hint?: string;
  uploadPrefix?: string;
}) {
  return (
    <ImageUploadField
      label={label}
      hint={hint ?? `PNG/SVG transparan disarankan. Maks. ${MAX_UPLOAD_MB} MB.`}
      imageUrl={logoUrl}
      alt={brandName}
      uploadPrefix={uploadPrefix}
      onChange={onChange}
      previewClassName="w-20 h-20 rounded-2xl"
      emptyPlaceholder={
        <div
          className="w-12 h-12 rounded-full"
          style={{
            background:
              "conic-gradient(from 0deg, #FFD521, #F50000, #B900B4, #1172ba, #FFD521)",
          }}
        />
      }
    />
  );
}
