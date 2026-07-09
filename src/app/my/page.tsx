import { redirect } from "next/navigation";

// "신청확인" was merged into /apply — this route is kept only so old links
// and bookmarks still land somewhere useful.
export default function MyPage() {
  redirect("/apply");
}
