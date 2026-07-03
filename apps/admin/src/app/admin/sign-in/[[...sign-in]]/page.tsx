import { Metadata } from "next";
import AdminSignInClient from "./AdminSignInClient";

export const metadata: Metadata = {
  title: "Hive Operations Console — Authenticate",
  description: "Authorized Operations Personnel Only.",
};

export default function Page() {
  return <AdminSignInClient />;
}
