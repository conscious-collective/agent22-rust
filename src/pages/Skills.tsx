import { useState } from "react";
import { Puzzle, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { useSkills } from "@/hooks/use-skills";

export function Skills() {
  const [search, setSearch] = useState("");
  const { data: skills = [], isLoading } = useSkills();

  const filtered = skills.filter(
    (s) =>
      search === "" ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      <header className="flex h-14 shrink-0 items-center justify-between border-b px-6">
        <h1 className="text-sm font-semibold">Skills</h1>
        <div className="relative w-56">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search skills…"
            className="pl-8 h-8 text-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <LoadingSpinner />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Puzzle}
            title={search ? "No skills match your search" : "No skills available"}
            description={search ? "Try a different search term." : "Start the OpenFang daemon to load skills."}
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
            {filtered.map((skill) => (
              <Card key={skill.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100">
                      <Puzzle className="h-4 w-4 text-purple-600" />
                    </div>
                    <div className="flex gap-1">
                      {skill.installed && (
                        <Badge variant="success" className="text-[10px]">Installed</Badge>
                      )}
                      {skill.runtime && (
                        <Badge variant="secondary" className="text-[10px]">{skill.runtime}</Badge>
                      )}
                    </div>
                  </div>
                  <h3 className="text-sm font-medium mb-0.5">{skill.name}</h3>
                  {skill.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{skill.description}</p>
                  )}
                  {skill.version && (
                    <p className="text-[10px] text-muted-foreground mt-2">v{skill.version}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
