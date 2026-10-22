import { Router, type IRouter } from "express";
import healthRouter from "./health";
import analyzeRouter from "./analyze";
import projectsRouter from "./projects";
import projectHistoryRouter from "./project-history";

const router: IRouter = Router();

router.use(healthRouter);
router.use(analyzeRouter);
router.use(projectsRouter);
router.use(projectHistoryRouter);

export default router;
