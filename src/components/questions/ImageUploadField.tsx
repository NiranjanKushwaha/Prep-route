import { useRef, useState } from "react";
import { ImagePlus, Link2, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fileToCompressedDataUrl, isProbablyImageUrl } from "@/lib/image";

interface ImageUploadFieldProps {
  value: string;
  onChange: (url: string) => void;
}

export function ImageUploadField({ value, onChange }: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [mode, setMode] = useState<"file" | "url">("file");

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const dataUrl = await fileToCompressedDataUrl(file);
      onChange(dataUrl);
      toast.success("Image attached to question");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not upload image");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label>Question image (optional)</Label>
        <div className="flex gap-1">
          <Button
            type="button"
            size="sm"
            variant={mode === "file" ? "secondary" : "ghost"}
            className="h-7 text-xs"
            onClick={() => setMode("file")}
          >
            Upload
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mode === "url" ? "secondary" : "ghost"}
            className="h-7 text-xs"
            onClick={() => setMode("url")}
          >
            URL
          </Button>
        </div>
      </div>

      {mode === "file" ? (
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
            className="hidden"
            onChange={(e) => void handleFile(e.target.files?.[0])}
          />
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ImagePlus className="h-4 w-4" />
            )}
            {uploading ? "Compressing…" : "Choose image"}
          </Button>
          <p className="text-xs text-muted-foreground">PNG / JPG / WEBP · auto-compressed</p>
        </div>
      ) : (
        <div className="relative">
          <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="https://…"
            value={value.startsWith("data:") ? "" : value}
            onChange={(e) => onChange(e.target.value.trim())}
          />
        </div>
      )}

      {value && isProbablyImageUrl(value) && (
        <div className="relative overflow-hidden rounded-lg border border-border bg-muted/30 p-2">
          <img
            src={value}
            alt="Question media preview"
            className="mx-auto max-h-48 rounded-md object-contain"
          />
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="absolute right-2 top-2 gap-1 text-destructive hover:text-destructive"
            onClick={() => onChange("")}
          >
            <Trash2 className="h-3.5 w-3.5" /> Remove
          </Button>
        </div>
      )}
    </div>
  );
}
