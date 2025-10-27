import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Upload } from "lucide-react";
import { chartAnalysisSchema } from "@/lib/validations";

interface ChartAnalysisFormProps {
  onSuccess: () => void;
}

const ChartAnalysisForm = ({ onSuccess }: ChartAnalysisFormProps) => {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    image_url: "",
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("chart-images")
        .upload(filePath, file);

      if (uploadError) {
        toast.error("Failed to upload image. Please try again.");
        return;
      }

      const { data } = supabase.storage.from("chart-images").getPublicUrl(filePath);

      setFormData({ ...formData, image_url: data.publicUrl });
      toast.success("Image uploaded");
    } catch (error: any) {
      toast.error("An unexpected error occurred during upload.");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate input
    const validation = chartAnalysisSchema.safeParse(formData);
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setLoading(true);
    try {
      const cleanedData = {
        title: validation.data.title,
        image_url: validation.data.image_url,
        description: validation.data.description || null,
      };

      const { error } = await supabase.from("chart_analysis").insert([cleanedData]);
      if (error) {
        toast.error("Failed to create chart analysis. Please try again.");
        return;
      }

      toast.success("Chart analysis created");
      queryClient.invalidateQueries({ queryKey: ["chart-analysis"] });
      queryClient.invalidateQueries({ queryKey: ["admin-chart-analysis"] });
      onSuccess();
    } catch (error: any) {
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Title</Label>
        <Input
          placeholder="Market Analysis - Gold Breakout"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
        />
      </div>
      <div>
        <Label>Description</Label>
        <Textarea
          placeholder="Detailed chart analysis..."
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={4}
        />
      </div>
      <div>
        <Label>Chart Image</Label>
        <div className="flex items-center gap-2">
          <Input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
          {uploading && <span className="text-sm text-muted-foreground">Uploading...</span>}
        </div>
        {formData.image_url && (
          <img src={formData.image_url} alt="Preview" className="mt-2 max-h-40 rounded" />
        )}
      </div>
      <Button type="submit" className="w-full btn-glow" disabled={loading || uploading}>
        {loading ? "Creating..." : "Create Analysis"}
      </Button>
    </form>
  );
};

export default ChartAnalysisForm;
