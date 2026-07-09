import { redirect } from "next/navigation";

// 급식확인 page was removed — QR check-in (/checkin/scan) is the only feature
// that lived here. Old links and bookmarks land on the scanner instead.
export default function CheckinPage() {
  redirect("/checkin/scan");
}
