"use client";

import { useState } from "react";
import { rpc } from "@/lib/rpc";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Key } from "lucide-react";

export default function ProfilePage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("ពាក្យសម្ងាត់ថ្មីមិនដូចគ្នាទេ");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("ពាក្យសម្ងាត់ថ្មីត្រូវមានយ៉ាងហោចណាស់ ៦ តួអក្សរ");
      return;
    }

    setIsLoading(true);
    try {
      const res = await rpc.auth["change-password"].$post({
        json: { currentPassword, newPassword },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("ផ្លាស់ប្តូរពាក្យសម្ងាត់បានសម្រេច");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        toast.error(data.message || "ការផ្លាស់ប្តូរពាក្យសម្ងាត់បរាជ័យ");
      }
    } catch (error) {
      toast.error("មានកំហុសមួយបានកើតឡើង");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto pt-4 pb-20">
      <div>
        <h1 className="text-2xl font-bold text-[#dcd3c1]">គណនីផ្ទាល់ខ្លួនរបស់ខ្ញុំ</h1>
        <p className="text-sm text-zinc-400 mt-1">
          គ្រប់គ្រងការកំណត់គណនី និងសុវត្ថិភាពរបស់អ្នក។
        </p>
      </div>

      <Card className="bg-[#3c3532]/30 border-[#dcd3c1]/10 text-zinc-100">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#dcd3c1]">
            <Key className="w-5 h-5" /> ផ្លាស់ប្តូរពាក្យសម្ងាត់
          </CardTitle>
          <CardDescription className="text-[#dcd3c1]/60">
            ត្រូវប្រាកដថាគណនីរបស់អ្នកប្រើប្រាស់ពាក្យសម្ងាត់វែង និងចៃដន្យដើម្បីរក្សាសុវត្ថិភាព។
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[#dcd3c1]/80">ពាក្យសម្ងាត់បច្ចុប្បន្ន</Label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="bg-black/20 border-[#dcd3c1]/20 focus-visible:ring-[#dcd3c1]/50 text-white"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#dcd3c1]/80">ពាក្យសម្ងាត់ថ្មី</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="bg-black/20 border-[#dcd3c1]/20 focus-visible:ring-[#dcd3c1]/50 text-white"
                required
              />
            </div>
            <div className="space-y-2 mb-4">
              <Label className="text-[#dcd3c1]/80">បញ្ជាក់ពាក្យសម្ងាត់ថ្មី</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="bg-black/20 border-[#dcd3c1]/20 focus-visible:ring-[#dcd3c1]/50 text-white"
                required
              />
            </div>
          </CardContent>
          <CardFooter className="border-t border-[#dcd3c1]/10 px-6 py-4">
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-[#dcd3c1] text-[#3c3532] hover:bg-[#dcd3c1]/90 font-bold"
            >
              {isLoading ? "កំពុងផ្លាស់ប្តូរ..." : "ផ្លាស់ប្តូរពាក្យសម្ងាត់"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
