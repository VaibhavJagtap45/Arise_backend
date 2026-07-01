import mongoose from "mongoose";

// A private coaching note an admin records against a user (e.g. "Increase water
// intake", "Great progress"). Visible only in the admin/coaching surface.
const coachNoteSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    authorId: { type: String, required: true },
    authorName: { type: String, default: "" },
    text: { type: String, required: true, trim: true, maxlength: 1000 },
  },
  { timestamps: true },
);

coachNoteSchema.index({ userId: 1, createdAt: -1 });

export const CoachNote = mongoose.model("CoachNote", coachNoteSchema);
