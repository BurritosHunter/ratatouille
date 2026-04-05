import Link from "next/link"

import { Button } from "@/components/ui/button"
import { requireUserId } from "@/lib/auth/auth-user"
import { listTasks } from "@/lib/data/tasks"

import { addTask, toggleTask } from "./actions"

export const dynamic = "force-dynamic"

export default async function TasksPage() {
  const userId = await requireUserId("/tasks")
  const tasks = await listTasks(userId)

  return (
    <div className="flex min-h-svh flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-medium">Tasks</h1>
        <Button asChild variant="outline" size="sm">
          <Link href="/">Home</Link>
        </Button>
      </div>

      <form action={addTask} className="flex max-w-md flex-col gap-2">
        <label className="text-sm text-muted-foreground" htmlFor="content">
          New task
        </label>
        <div className="flex gap-2">
          <input
            id="content"
            name="content"
            type="text"
            required
            className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-9 w-full min-w-0 rounded-md border px-3 py-1 text-sm shadow-xs focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            placeholder="What needs doing?"
          />
          <Button type="submit">Add</Button>
        </div>
      </form>

      {tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground">No tasks yet. Add one above.</p>
      ) : (
        <ul className="flex max-w-md flex-col gap-2">
          {tasks.map((task) => (
            <li
              key={task.id}
              className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm"
            >
              <span className={task.isCompleted ? "text-muted-foreground line-through" : undefined}>
                {task.content}
              </span>
              <form action={toggleTask}>
                <input type="hidden" name="id" value={task.id} />
                <Button type="submit" variant="secondary" size="sm">
                  {task.isCompleted ? "Mark incomplete" : "Mark done"}
                </Button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
