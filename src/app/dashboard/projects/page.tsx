'use client'

import React, { useState, useEffect } from 'react'
import { 
  DndContext, 
  DragOverlay, 
  closestCorners, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  defaultDropAnimationSideEffects,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
} from '@dnd-kit/core'
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { 
  Plus, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Settings2,
  Box,
  Layers,
  Zap,
  CheckCircle,
  MoreVertical
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Modal from '@/components/ui/Modal'
import Tooltip from '@/components/ui/Tooltip'
// --- Types ---
type ProjectStatus = 'idea' | 'design' | 'ready' | 'printing' | 'post' | 'done'

interface Project {
  id: string
  title: string
  client: string
  priority: 'low' | 'medium' | 'high'
  progress: number
  status: ProjectStatus
  dueDate: string
}

interface Column {
  id: ProjectStatus
  title: string
  color: string
}

const COLUMNS: Column[] = [
  { id: 'idea', title: '💡 Idea / Diseño', color: 'border-blue-500/50' },
  { id: 'ready', title: '⏱️ Por Imprimir', color: 'border-yellow-500/50' },
  { id: 'printing', title: '🔧 Imprimiendo', color: 'border-brand-orange/50' },
  { id: 'post', title: '✨ Post-Procesado', color: 'border-purple-500/50' },
  { id: 'done', title: '✅ Terminado', color: 'border-green-500/50' },
]

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [activeProject, setActiveProject] = useState<Project | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    title: '', client: '', priority: 'medium', dueDate: ''
  })

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, status: 'idea' })
      })
      if (res.ok) {
        setIsAddModalOpen(false)
        setFormData({ title: '', client: '', priority: 'medium', dueDate: '' })
        fetchProjects() // Recargar UI
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsSaving(false)
    }
  }
  const fetchProjects = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/projects')
      const data = await res.json()
      if (!data.error) setProjects(data)
    } catch (err) {
      console.error('Error loading projects:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchProjects()
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const onDragStart = (event: DragStartEvent) => {
    if (event.active.data.current?.type === 'Project') {
      setActiveProject(event.active.data.current.project)
    }
  }

  const onDragOver = (event: DragOverEvent) => {
    const { active, over } = event
    if (!over) return

    const activeId = active.id
    const overId = over.id

    if (activeId === overId) return

    const isActiveAProject = active.data.current?.type === 'Project'
    const isOverAProject = over.data.current?.type === 'Project'

    if (!isActiveAProject) return

    // Dropping a Project over another Project
    if (isActiveAProject && isOverAProject) {
      setProjects((projects) => {
        const activeIndex = projects.findIndex((p) => p.id === activeId)
        const overIndex = projects.findIndex((p) => p.id === overId)

        if (projects[activeIndex].status !== projects[overIndex].status) {
          projects[activeIndex].status = projects[overIndex].status
          return arrayMove(projects, activeIndex, overIndex - 1)
        }

        return arrayMove(projects, activeIndex, overIndex)
      })
    }

    const isOverAColumn = COLUMNS.some((col) => col.id === overId)

    // Dropping a Project over a Column
    if (isActiveAProject && isOverAColumn) {
      setProjects((projects) => {
        const activeIndex = projects.findIndex((p) => p.id === activeId)
        projects[activeIndex].status = overId as ProjectStatus
        return arrayMove(projects, activeIndex, activeIndex)
      })
    }
  }

  const onDragEnd = async (event: DragEndEvent) => {
    setActiveProject(null)

    const { active, over } = event
    if (!over) return

    const activeId = active.id
    const overId = over.id

    const activeIndex = projects.findIndex((p) => p.id === activeId)
    const overIndex = projects.findIndex((p) => p.id === overId)

    if (activeIndex !== overIndex || projects[activeIndex].status !== over.id) {
        const newStatus = over.id as ProjectStatus
        setProjects((projects) => arrayMove(projects, activeIndex, overIndex))
        
        // Persistir cambio de estado
        try {
            await fetch('/api/projects', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: activeId, status: newStatus })
            })
        } catch (err) {
            console.error('Error saving project move:', err)
        }
    }
  }

  return (
    <div className="h-full flex flex-col space-y-8 animate-in fade-in duration-700">
      <div className="flex justify-between items-center sm:items-end">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white uppercase italic">Work-Flow</h1>
          <p className="text-neutral-500 text-sm mt-1">Gestión visual de la cadena de producción.</p>
        </div>
        <div className="flex gap-2">
            <div className="flex gap-2">
                <Tooltip content="Filtrar proyectos">
                    <button className="flex items-center gap-2 px-4 py-2 bg-neutral-900 border border-neutral-800 rounded-xl text-xs font-bold text-neutral-400 hover:text-white transition-all tap-target">
                        <Settings2 size={14} /> Filtros
                    </button>
                </Tooltip>
                <Tooltip content="Crear nuevo proyecto">
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-brand-orange text-black rounded-xl text-xs font-black transition-all hover:scale-105 active:scale-95 shadow-lg shadow-brand-orange/20 tap-target"
                    >
                        <Plus size={14} /> NUEVO PROYECTO
                    </button>
                </Tooltip>
            </div>
        </div>
      </div>

      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Nuevo Proyecto">
        <form className="space-y-4" onSubmit={handleAddProject}>
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold text-neutral-500">Título del Proyecto</label>
            <input type="text" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-brand-orange" placeholder="Casco Iron Man Mark 85" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold text-neutral-500">Cliente</label>
            <input type="text" value={formData.client} onChange={e => setFormData({...formData, client: e.target.value})} className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-brand-orange" placeholder="Opcional" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-neutral-500">Prioridad</label>
                <select value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})} className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white outline-none appearance-none focus:border-brand-orange">
                    <option value="low">Baja</option>
                    <option value="medium">Media</option>
                    <option value="high">Alta</option>
                </select>
            </div>
            <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-neutral-500">Vencimiento</label>
                <input type="date" value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-brand-orange" />
            </div>
          </div>
          <button type="submit" disabled={isSaving} className="w-full py-3 mt-4 bg-brand-orange text-black font-black text-xs rounded-xl transition-all hover:scale-[1.02] disabled:opacity-50">
            {isSaving ? 'CREANDO...' : 'CREAR PROYECTO'}
          </button>
        </form>
      </Modal>

      <div className="flex-1 overflow-x-auto pb-4 custom-scrollbar">
        <DndContext 
          sensors={sensors} 
          collisionDetection={closestCorners} 
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragEnd={onDragEnd}
        >
          <div className="flex gap-4 sm:gap-6 min-h-[500px] px-1 sm:px-0">
            {COLUMNS.map((col) => (
              <KanbanColumn 
                key={col.id} 
                column={col} 
                projects={projects.filter(p => p.status === col.id)} 
              />
            ))}
          </div>

          <DragOverlay dropAnimation={{
              sideEffects: defaultDropAnimationSideEffects({
                  styles: {
                      active: {
                          opacity: '0.5',
                      },
                  },
              }),
          }}>
            {activeProject ? (
              <ProjectCard project={activeProject} isOverlay />
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  )
}

// --- Subcomponents ---

function KanbanColumn({ column, projects }: { column: Column, projects: Project[] }) {
  const { setNodeRef } = useSortable({
    id: column.id,
    data: { type: 'Column', column },
  })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col w-72 sm:w-80 min-w-[280px] sm:min-w-[320px] rounded-2xl bg-neutral-900/50 border",
        column.color
      )}
    >
      <div className="p-4 border-b border-neutral-800/50 flex items-center justify-between bg-neutral-900/50 rounded-t-2xl">
        <h2 className="font-bold text-sm text-neutral-200">{column.title}</h2>
        <span className="flex items-center justify-center w-6 h-6 text-xs font-bold bg-neutral-800 text-neutral-400 rounded-full">
          {projects.length}
        </span>
      </div>

      <div className="flex-1 p-3 flex flex-col gap-3 min-h-[150px]">
        <SortableContext items={projects.map((p) => p.id)} strategy={verticalListSortingStrategy}>
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </SortableContext>
      </div>
    </div>
  )
}

function ProjectCard({ project, isOverlay }: { project: Project, isOverlay?: boolean }) {
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: project.id,
    data: { type: 'Project', project },
  })

  const style = {
    transition,
    transform: CSS.Transform.toString(transform),
  }

  if (isDragging && !isOverlay) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="w-full h-[120px] bg-neutral-800/20 border-2 border-brand-orange/50 border-dashed rounded-xl"
      />
    )
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "group bg-neutral-800 border border-neutral-700/50 rounded-xl p-4 cursor-grab hover:border-brand-orange/50 transition-colors shadow-sm",
        isOverlay && "cursor-grabbing rotate-2 scale-105 shadow-xl border-brand-orange/50 bg-neutral-800/90 backdrop-blur-md"
      )}
    >
      <div className="flex justify-between items-start mb-2">
        <span className="text-[10px] font-black uppercase text-brand-orange tracking-wider bg-brand-orange/10 px-2 py-0.5 rounded-sm">
          {project.client ?? 'JR3D'}
        </span>
        <button className="text-neutral-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
          <MoreVertical size={14} />
        </button>
      </div>

      <h3 className="font-bold text-white text-sm mb-1 leading-tight">{project.title}</h3>
      
      <div className="flex items-center gap-1.5 text-xs text-neutral-500 mb-3">
        <Clock size={12} className="text-neutral-600" />
        <span>Vence: <span className="text-neutral-400">{project.dueDate ?? 'N/A'}</span></span>
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between text-[10px] font-bold text-neutral-500">
          <span>PROGRESS</span>
          <span className="text-brand-orange">{project.progress ?? 0}%</span>
        </div>
        <div className="w-full bg-neutral-900 rounded-full h-1.5 overflow-hidden">
          <div 
            className="bg-gradient-to-r from-brand-orange to-brand-cyan h-1.5 rounded-full" 
            style={{ width: `${project.progress ?? 0}%` }}
          />
        </div>
      </div>
    </div>
  )
}
