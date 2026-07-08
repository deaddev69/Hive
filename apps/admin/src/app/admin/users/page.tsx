"use client";

import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Button, Card, CardContent } from "@hive/ui";
import { Loader2, Users, ShieldAlert, Store, User } from "lucide-react";

export default function AdminUsersPage() {
  const users = useQuery(api.users.getUsers, {});
  const updateUserRole = useMutation(api.users.updateUserRole);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleRoleChange = async (userId: string, newRole: "customer" | "boutique_owner" | "admin") => {
    if (!confirm(`Are you sure you want to change this user's role to ${newRole.toUpperCase()}?`)) return;
    
    setUpdatingId(userId);
    try {
      await updateUserRole({ userId: userId as any, role: newRole });
    } catch (err: any) {
      alert("Failed to update role: " + err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  if (users === undefined) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-hive-amber" />
        <p className="text-sm text-hive-text-muted font-medium">Loading users...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 text-left">
      <div>
        <h1 className="text-3xl font-serif font-black text-hive-dark">User Management</h1>
        <p className="text-sm text-hive-text-muted">Manage roles and permissions for all users in the system.</p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {users.map((user: any) => (
          <Card key={user._id} className="overflow-hidden border border-hive-border bg-white shadow-sm">
            <CardContent className="p-4 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
              
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className={`w-12 h-12 rounded-xl border border-hive-border/50 flex items-center justify-center flex-shrink-0 ${
                  user.role === "admin" ? "bg-red-50 text-red-500" :
                  user.role === "boutique_owner" ? "bg-amber-50 text-amber-600" :
                  "bg-slate-50 text-slate-500"
                }`}>
                  {user.role === "admin" ? <ShieldAlert className="w-6 h-6" /> :
                   user.role === "boutique_owner" ? <Store className="w-6 h-6" /> :
                   <User className="w-6 h-6" />}
                </div>
                
                <div className="flex flex-col min-w-0 text-left">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-serif font-bold text-hive-dark text-base truncate">
                      {user.email || user.phone || "No Email/Phone provided"}
                    </span>
                    <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                      user.role === "admin" ? "bg-red-100 text-red-700 border-red-200" :
                      user.role === "boutique_owner" ? "bg-amber-100 text-amber-800 border-amber-200" :
                      "bg-slate-100 text-slate-600 border-slate-200"
                    } border`}>
                      {user.role.replace("_", " ")}
                    </span>
                  </div>
                  <span className="text-xs text-hive-text-muted mt-0.5 flex items-center gap-2">
                    <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded">{user.clerkId}</span>
                    <span>•</span>
                    <span>Joined {new Date(user.createdAt).toLocaleDateString()}</span>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0 self-end md:self-center">
                <select
                  value={user.role}
                  onChange={(e) => handleRoleChange(user._id, e.target.value as any)}
                  disabled={updatingId === user._id}
                  className="px-3 py-1.5 rounded-xl border border-hive-border/60 text-xs font-semibold text-hive-dark bg-hive-cream/20 focus:outline-none focus:ring-2 focus:ring-hive-gold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors hover:bg-hive-cream/40"
                >
                  <option value="customer">Customer</option>
                  <option value="boutique_owner">Boutique Owner</option>
                  <option value="admin">Admin</option>
                </select>
                {updatingId === user._id && <Loader2 className="w-4 h-4 animate-spin text-hive-amber" />}
              </div>
            </CardContent>
          </Card>
        ))}
        {users.length === 0 && (
          <div className="text-center text-hive-text-muted text-sm py-12 bg-white border border-hive-border rounded-xl">
            No users found in the system.
          </div>
        )}
      </div>
    </div>
  );
}
