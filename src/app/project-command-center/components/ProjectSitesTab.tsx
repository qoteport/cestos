import React from 'react';
import { MapPin, Users, Wrench } from 'lucide-react';

const SITES = [
  {
    id: 'site-001',
    name: 'Alpha Main',
    type: 'DRILL_SITE',
    employees: 22,
    assets: 3,
    status: 'ACTIVE',
    coordinates: '5.1832° N, 2.4671° W',
    description: 'Primary drill site — 4 active holes',
  },
  {
    id: 'site-002',
    name: 'Alpha North Pad',
    type: 'DRILL_SITE',
    employees: 12,
    assets: 2,
    status: 'ACTIVE',
    coordinates: '5.1901° N, 2.4589° W',
    description: 'Secondary drill pad — 2 active holes',
  },
  {
    id: 'site-003',
    name: 'Alpha South Camp',
    type: 'CAMP',
    employees: 8,
    assets: 1,
    status: 'ACTIVE',
    coordinates: '5.1754° N, 2.4703° W',
    description: 'Accommodation and logistics base',
  },
];

export default function ProjectSitesTab() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {SITES?.map(site => (
        <div key={site?.id} className="card card-hover p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-secondary flex items-center justify-center">
                <MapPin size={16} className="text-primary" />
              </div>
              <div>
                <p className="text-sm font-700 text-foreground">{site?.name}</p>
                <p className="text-2xs text-muted-foreground">{site?.type?.replace('_', ' ')}</p>
              </div>
            </div>
            <span className="badge badge-active">{site?.status}</span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">{site?.description}</p>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <Users size={12} className="text-primary" />
              <span className="font-600 text-foreground">{site?.employees}</span>
              <span className="text-muted-foreground">people</span>
            </div>
            <div className="flex items-center gap-1">
              <Wrench size={12} className="text-primary" />
              <span className="font-600 text-foreground">{site?.assets}</span>
              <span className="text-muted-foreground">assets</span>
            </div>
          </div>
          <p className="text-2xs text-muted-foreground mt-2">{site?.coordinates}</p>
        </div>
      ))}
    </div>
  );
}