import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { register, event, location } from "@/db/schema";

export const registerSchema = createInsertSchema(register, {
  fullName: (schema) =>
    schema.min(3, { message: "ឈ្មោះពេញត្រូវមានយ៉ាងហោចណាស់ ៣ អក្សរ" }),
  age: (schema) => schema.min(1, { message: "សូមបញ្ចូលអាយុរបស់អ្នក" }),
  phone: (schema) =>
    schema
      .min(1, { message: "សូមបញ្ចូលលេខទូរស័ព្ទ" })
      .transform((val) => val.replace(/\s+/g, "").replace(/-/g, ""))
      .pipe(
        z.string().regex(/^(0|\+855)(\d{8,9})$/, {
          message: "ទម្រង់លេខទូរស័ព្ទមិនត្រឹមត្រូវ",
        }),
      ),
  socialProofs: z.string().optional().nullable(),
  position: z.string().min(1, { message: "សូមជ្រើសរើសតួនាទីរបស់អ្នក" }),
  profileImage: z
    .string()
    .min(1, { message: "សូមបញ្ចូលរូបថតរបស់អ្នក (Profile photo required)" }),
})
  .refine(
    (data) => {
      const ageNum = parseInt(data.age, 10);
      return !isNaN(ageNum) && ageNum >= 18;
    },
    {
      message: "អាយុត្រូវតែយ៉ាងហោចណាស់ ១៨ ឆ្នាំ",
      path: ["age"],
    },
  )
  .refine((data) => data.agreedTerms === true, {
    message: "អ្នកត្រូវតែយល់ព្រមតាមលក្ខខណ្ឌ",
    path: ["agreedTerms"],
  });

export type RegisterSchema = z.infer<typeof registerSchema>;

export const socialMediaEventSchema = z.object({
  eventId: z.number(),
  type: z.enum(["facebook", "tiktok", "telegram", "youtube"]),
  url: z.string().url("Invalid URL"),
  label: z.string().optional(),
});

export const locationSchema = createInsertSchema(location, {
  name: (schema) => schema.min(1, { message: "Name is required" }),
  mapUrl: (schema) =>
    z.string().url("Invalid Google Maps URL").or(z.literal("")).optional(),
});
export type LocationSchema = z.infer<typeof locationSchema>;

export const eventSchema = createInsertSchema(event, {
  name: (schema) => schema.min(1, { message: "Name is required" }),
  date: z
    .string()
    .or(z.date())
    .transform((val) => new Date(val)),
  status: z.enum(["active", "inactive"]).optional(),
  locationId: z.number().nullable().optional(),
});
export type EventSchema = z.infer<typeof eventSchema>;

export const idParamSchema = z.object({
  id: z.string().regex(/^\d+$/, "ID must be a number"),
});
