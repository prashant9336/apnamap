import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file     = formData.get("file") as File;
  const bucket   = (formData.get("bucket") as string) || "shop-images";

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  // Validate MIME via client header (first pass)
  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Only JPEG, PNG, WebP, or GIF images are allowed" }, { status: 400 });
  }
  // Validate size (5MB)
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });
  }
  // Validate magic bytes — prevents MIME type spoofing (SVG/script uploads)
  const headerBytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const isJpeg = headerBytes[0] === 0xFF && headerBytes[1] === 0xD8 && headerBytes[2] === 0xFF;
  const isPng  = headerBytes[0] === 0x89 && headerBytes[1] === 0x50 && headerBytes[2] === 0x4E && headerBytes[3] === 0x47;
  const isWebp = headerBytes[0] === 0x52 && headerBytes[1] === 0x49 && headerBytes[8] === 0x57 && headerBytes[9] === 0x45;
  const isGif  = headerBytes[0] === 0x47 && headerBytes[1] === 0x49 && headerBytes[2] === 0x46;
  if (!isJpeg && !isPng && !isWebp && !isGif) {
    return NextResponse.json({ error: "Invalid image file" }, { status: 400 });
  }

  // Use a safe fixed extension based on validated type (never trust client filename)
  const EXT_MAP: Record<string, string> = {
    "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif"
  };
  const ext  = EXT_MAP[file.type] ?? "jpg";
  const path = `${user.id}/${Date.now()}.${ext}`;

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { upsert: true, contentType: file.type });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
  return NextResponse.json({ url: urlData.publicUrl });
}
