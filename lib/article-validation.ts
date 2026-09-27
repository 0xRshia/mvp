import { ApiError } from "@/lib/server";

function field(value: unknown, name: string, max: number, required = true) {
  if (typeof value !== "string") throw new ApiError(400, `${name} را وارد کنید.`);
  const normalized = value.trim();
  if (required && !normalized) throw new ApiError(400, `${name} را وارد کنید.`);
  if (normalized.length > max) throw new ApiError(400, `${name} بیش از حد طولانی است.`);
  return normalized;
}

export function articleInput(data: Record<string, unknown>) {
  const slug = field(data.slug, "نشانی مقاله", 140);
  if (!/^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u.test(slug)) throw new ApiError(400, "نشانی مقاله فقط می‌تواند از حروف، عدد و خط تیره تشکیل شود.");
  const status = data.status;
  if (status !== "draft" && status !== "published") throw new ApiError(400, "وضعیت مقاله معتبر نیست.");
  return {
    slug,
    title: field(data.title, "عنوان", 180),
    excerpt: field(data.excerpt, "خلاصه", 400, false),
    body: field(data.body, "متن مقاله", 50000),
    category: field(data.category, "دسته‌بندی", 80, false),
    author_name: field(data.author_name, "نام نویسنده", 100),
    status,
  };
}
