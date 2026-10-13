import '@testing-library/jest-dom';
import path from "path";
import { configureSqlite } from "@/mock/sqlite";

configureSqlite({
  locateFile: (file) => path.join(process.cwd(), "node_modules/sql.js/dist", file),
});
