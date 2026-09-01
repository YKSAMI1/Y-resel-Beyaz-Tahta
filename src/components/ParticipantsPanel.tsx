"use client";

import React from 'react';
import { Participant } from '@/types';

interface ParticipantsPanelProps {
  participants: Participant[];
}

export default function ParticipantsPanel({ participants }: ParticipantsPanelProps) {
  return (
    <div className="w-full h-full flex flex-col bg-white">
      <div className="p-3 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-800">👥 Katılımcılar</h3>
        <p className="text-xs text-gray-500 mt-0.5">Çevrimiçi: {participants.length}</p>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {participants.map(p => (
          <div key={p.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm"
              style={{ backgroundColor: p.color }}
            >
              {p.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-700 font-medium truncate">{p.name}</p>
              {p.isDrawing && (
                <p className="text-[10px] text-blue-500">✏️ Çiziyor...</p>
              )}
            </div>
            {p.isOwner && (
              <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">
                Sahip
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
