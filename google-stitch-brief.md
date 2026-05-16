# PrintHype — Google Stitch Design Brief

> Copiá y pegá esto en [stitch.withgoogle.com](https://stitch.withgoogle.com) para generar UI components al estilo PrintHype.

---

## PROMPT 1: Dashboard Principal

```
Generate a dark-themed admin dashboard for a 3D printing management SaaS called "PrintHype".

Brand colors:
- Primary: #FF6600 (orange)
- Secondary: #00F2FF (cyan)  
- Background: #050505 (near black)
- Cards: rgba(255,255,255,0.03) with glassmorphism

Layout:
- Left sidebar with icon+text nav items: Resumen, Pedidos, Inventario, AI Lab, Viral Cockpit, Proyectos, Ajustes
- Top area: welcome title "Buenos días" in white with orange accent
- 4 stat cards in a row: Pedidos Hoy, ROI, Impresoras, Stock Crítico — dark glass cards with subtle icons
- Bottom: recent activity list (left 2/3) and AI insights card (right 1/3)

Style: cyberpunk-industrial, glassmorphism, sharp typography, monospace for data
```

## PROMPT 2: Tabla de Pedidos

```
Design a dark order management table for a 3D printing ERP called PrintHype.

Features needed:
- Search bar with glass effect
- Status filter dropdown (Todos, Pendientes, En Imprenta, Para Enviar, Completados)
- Export button with CSV option
- "+ Nueva Orden" CTA button in brand orange with glow shadow
- Table columns: ID Orden (truncated), Cliente (with avatar circle + WhatsApp link icon), Estado (colored badges), Total (monospace), action link "VER"
- Each row should be dark glass with hover effect

Status badges:
- PENDING: yellow
- PRINTING: orange with pulse animation  
- SHIPPED: cyan
- COMPLETED: green

Color scheme: #FF6600 primary, #050505 background, glass cards
Typography: Inter, extra bold headings, monospace for IDs
```

## PROMPT 3: AI Lab Chat Interface

```
Design an AI chat interface for a local LLM (Ollama) integrated into a 3D printing management app.

Tool selector sidebar (left):
- 3 tool buttons stacked: "Calculador de Costos", "Content Generator", "Python Scripting"
- Active tool highlighted with brand orange border and glow

Main chat area (right):
- Header showing "Consola de Ejecución Local" with context indicator
- Chat messages with alternating layout: AI on left (orange icon, dark glass bubble), user on right (neutral icon, lighter bubble)
- Bottom: textarea input with send button + paperclip button for STL file upload
- Quick action cards below: 4 suggestion buttons in grid

STL file upload chip:
- Shows file name and dimensions
- Orange border, close button, file icon

Brand colors: #FF6600, #00F2FF, background #050505
```

## PROMPT 4: Login Page

```
Design a dark login page for "PrintHype - Gestión JR3D" 3D printing management SaaS.

Elements:
- Centered glass card on dark background (#050505)
- Orange logo "P" icon on top with glow
- Title "PrintHype" with orange accent
- Subtitle "SaaS de Gestión JR3D"
- Email input with dark glass style, focus ring in orange
- Password input matching style
- Two buttons: "Ingresar" (orange filled) and "Crear Cuenta" (outline)
- Error/success alert banners with icon
- Footer "Panel de gestión — JR3D"

Style: minimal, industrial cyberpunk, glassmorphism
Font: Inter, bold uppercase labels
```

---

## Design System Tokens

```json
{
  "colors": {
    "brand-orange": "#FF6600",
    "brand-cyan": "#00F2FF",
    "bg-primary": "#050505",
    "bg-card": "rgba(255,255,255,0.03)",
    "border": "rgba(255,255,255,0.05)",
    "text-primary": "#FFFFFF",
    "text-secondary": "rgba(255,255,255,0.5)"
  },
  "effects": {
    "glass-blur": "backdrop-blur-2xl",
    "card-radius": "rounded-3xl",
    "glow-orange": "0 0 20px rgba(255,102,0,0.3)",
    "glow-cyan": "0 0 20px rgba(0,242,255,0.3)"
  },
  "typography": {
    "headings": "font-black tracking-tight uppercase",
    "data": "font-mono font-bold",
    "labels": "text-[10px] font-black uppercase tracking-widest"
  }
}
```

> Generá cada prompt en Stitch, descargá el código resultante, y lo podemos integrar al proyecto.
