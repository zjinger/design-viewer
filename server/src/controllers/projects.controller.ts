import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { BaseControllerImpl } from "./base.controller";
import { IProjectDto } from "@/schemas/Projects";
import { AppError } from "@/helpers/errors.helper";

/**
 *  @description 项目控制器实现类
 *  @author ZhangJing
 *  @date 2025-06-16
 *  @export
 */
export class ProjectsControllerImpl extends BaseControllerImpl {
  constructor(fastify: FastifyInstance) {
    super(fastify);
  }

  /**
   * @description 获取项目列表
   * @returns {Promise<IProjectDto>}
   */
  async getProjects(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<IProjectDto> {
    try {
      const projects = this.db
        .prepare("SELECT * FROM tbl_projects ORDER BY id DESC")
        .all();
      return this.handleSuccess(reply, projects);
    } catch (error) {
      return this.handleError(reply, new AppError("获取项目列表失败"), error);
    }
  }

  /**
   * @description 获取项目详情
   * @param {FastifyRequest} request
   * @param {FastifyReply} reply
   * @returns {Promise<IProjectDto>}
   */
  async getProjectInfo(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ): Promise<IProjectDto> {
    const { id } = request.params;
    try {
      const project = this.db
        .prepare("SELECT * FROM tbl_projects WHERE id = ?")
        .get(id);
      if (!project) {
        return this.handleError(reply, new AppError("项目不存在"));
      }
      return this.handleSuccess(reply, project);
    } catch (error) {
      return this.handleError(reply, new AppError("获取项目详情失败"), error);
    }
  }

  /**
   * @description 创建或更新项目
   * @param {FastifyRequest} request
   * @param {FastifyReply} reply
   * @returns {Promise<IProjectDto>}
   */
  async saveProject(
    request: FastifyRequest<{ Body: IProjectDto }>,
    reply: FastifyReply
  ): Promise<IProjectDto> {
    const projectData = request.body;
    try {
      if (!projectData.id) {
        // 创建新项目
        const result = this.db
          .prepare("INSERT INTO tbl_projects (name, description) VALUES (?, ?)")
          .run(projectData.name, projectData.description);
        projectData.id = result.lastInsertRowid.toString();
      } else {
        // 更新现有项目
        this.db
          .prepare(
            "UPDATE tbl_projects SET name = ?, description = ? WHERE id = ?"
          )
          .run(projectData.name, projectData.description, projectData.id);
      }
      return this.handleSuccess(reply, projectData);
    } catch (error) {
      return this.handleError(reply, new AppError("保存项目失败"), error);
    }
  }

  /**
   * @description 删除项目
   * @param {FastifyRequest} request
   * @param {FastifyReply} reply
   * @returns {Promise<void>}
   */
  async deleteProject(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ): Promise<void> {
    const { id } = request.params;
    try {
      if (!id) {
        return this.handleError(reply, new AppError("项目ID不能为空"));
      }

      // 逻辑删除项目
      // 这里可以根据实际需求修改为物理删除或逻辑删除
      // 物理删除
      // const result = this.db.prepare("DELETE FROM tbl_projects WHERE id = ?").run(id);
      // 逻辑删除
      const result = this.db
        .prepare("UPDATE tbl_projects SET sysDeleted = 1 WHERE id = ?")
        .run(id);
      if (result.changes === 0) {
        return this.handleError(reply, new AppError("项目不存在或已被删除"));
      }
      return this.handleSuccess(reply, { message: "项目删除成功" });
    } catch (error) {
      return this.handleError(reply, new AppError("删除项目失败"), error);
    }
  }
}
