export interface Skill {
  id: string;
  name: string;
  description?: string;
  runtime?: string;
  version?: string;
  installed: boolean;
  tags: string[];
}
