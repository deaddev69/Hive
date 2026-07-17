import React from "react";
import SettingsClient from "./SettingsClient";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Platform Config | Hive Admin",
};

export default function AdminSettingsPage() {
  return (
    <div className="flex-1 max-w-[1600px] w-full mx-auto p-4 md:p-8 pt-6">
      <div className="flex flex-col gap-1 mb-8">
        <h1 className="text-2xl md:text-3xl font-serif font-black text-hive-dark">
          Platform Configuration
        </h1>
        <p className="text-sm text-hive-text-muted">
          Manage core marketplace unit economics and global settings.
        </p>
      </div>
      <SettingsClient />
    </div>
  );
}
