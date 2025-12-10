import { redirect } from "next/navigation";

export default function CreateSchedulePage() {
  redirect("/admin/product-selection");
  return null;
}
