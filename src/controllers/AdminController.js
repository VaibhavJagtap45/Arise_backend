import { z } from "zod";
import { adminService } from "../services/AdminService.js";

const CoachNoteSchema = z.object({
  text: z.string().trim().min(1).max(1000),
});

class AdminController {
  async getUsers(req, res, next) {
    try {
      const data = await adminService.getUsersOverview();
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getUser(req, res, next) {
    try {
      const data = await adminService.getUserDetail(req.params.id);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async addCoachNote(req, res, next) {
    try {
      const { text } = CoachNoteSchema.parse(req.body);
      const data = await adminService.addCoachNote(
        req.params.id,
        req.adminUser,
        text,
      );
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async deleteCoachNote(req, res, next) {
    try {
      const data = await adminService.deleteCoachNote(
        req.params.id,
        req.params.noteId,
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async deleteUser(req, res, next) {
    try {
      const data = await adminService.deleteUser(req.params.id, req.user.id);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export const adminController = new AdminController();
