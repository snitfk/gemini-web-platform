import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Home, Settings, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface SidebarProps {
  collapsed?: boolean;
}

const navItems = [
  { to: '/workspaces', icon: Home, label: 'Workspaces' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar({ collapsed = false }: SidebarProps) {
  if (collapsed) {
    return (
      <aside className="w-14 border-r bg-muted/40 flex flex-col items-center py-4 gap-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'p-2 rounded-lg transition-all hover:bg-accent',
                isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'
              )
            }
            title={item.label}
          >
            <item.icon className="h-5 w-5" />
          </NavLink>
        ))}
      </aside>
    );
  }

  return (
    <aside className="w-64 border-r bg-muted/40 flex flex-col">
      <div className="p-4">
        <Button className="w-full justify-start gap-2" asChild>
          <NavLink to="/workspaces/new">
            <Plus className="h-4 w-4" />
            New Workspace
          </NavLink>
        </Button>
      </div>

      <Separator />

      <ScrollArea className="flex-1">
        <nav className="flex flex-col gap-1 p-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-accent',
                  isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'
                )
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </ScrollArea>
    </aside>
  );
}
