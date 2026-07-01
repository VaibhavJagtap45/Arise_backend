import { adminService } from "../services/AdminService.js";

// Query/body validation happens at the route edge (validators/admin.validators.js).
class AdminController {
  async getUsers(req, res, next) {
    try {
      const data = await adminService.getUsersOverview(req.validated);
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
      const { text } = req.validated;
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
