import { getSql } from "@/lib/db"
import type { Task } from "@/lib/types/task"

type TaskRow = {
  id: number
  content: string
  is_completed: boolean
}

function toTask(row: TaskRow): Task {
  return { id: row.id, content: row.content, isCompleted: row.is_completed }
}

/** Expects a `tasks` table: id serial PK, content text, is_completed boolean */
export async function listTasks(): Promise<Task[]> {
  const rows = await getSql()`
    SELECT id, content, is_completed
    FROM tasks
    ORDER BY id ASC
  `
  return (rows as TaskRow[]).map(toTask)
}

export async function createTask(content: string): Promise<Task> {
  const rows = await getSql()`
    INSERT INTO tasks (content, is_completed)
    VALUES (${content}, false)
    RETURNING id, content, is_completed
  `
  const row = (rows as TaskRow[])[0]
  if (!row) throw new Error("Failed to create task")
  return toTask(row)
}

export async function setTaskCompleted(id: number, isCompleted: boolean): Promise<void> {
  await getSql()`
    UPDATE tasks SET is_completed = ${isCompleted} WHERE id = ${id}
  `
}

export async function flipTaskCompletion(id: number): Promise<void> {
  await getSql()`
    UPDATE tasks SET is_completed = NOT is_completed WHERE id = ${id}
  `
}
