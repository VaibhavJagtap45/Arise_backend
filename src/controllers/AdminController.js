import { adminService } from "../services/AdminService.js";

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
}

export const adminController = new AdminController();
