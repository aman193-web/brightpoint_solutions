import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Info, Plus, Search, X } from 'lucide-react';
import { ColumnLibraryView } from '../library/ColumnLibraryView';
import { LibraryPicker } from '../library/LibraryPicker';
import { LIBRARIES, Library, Assembly, Part, ALL_ASSEMBLIES, MASTER_PARTS, categoryOf, defaultMeasureType } from '../library/libraryData';
import { CategoryGroup } from '../../lib/projectBreakdown';
import { Classification, classificationLabel } from '../../lib/takeoffClassification';
import { addRecord } from '../../lib/takeoffRecords';

/**
 * Manual Takeoff.
 *
 * The estimator picks an assembly or a part and states a quantity. No drawing is
 * involved, and none is required — a 200A service is one service whether or not
 * anybody clicks it on a sheet.
 *
 * This is deliberately **not a new library**. It hosts `ColumnLibraryView`, the
 * same Browse experience the Libraries page uses, with the same hierarchy, search,
 * global filters, assemblies, parts, BOM and list view. The only thing added is
 * where "Add to Takeoff" lands: a project takeoff record carrying the active
 * classification. Reimplementing the browser here would have guaranteed the two
 * drift apart and forced the estimator to learn both.
 */
export function ManualTakeoffPanel({ activeCls, groups, onRecorded, askQuantity }: {
  /** The active classification bar's context — inherited by everything added. */
  activeCls: Classification;
  groups: CategoryGroup[];
  onRecorded: (name: string, qty: number) => void;
  /**
   * Confirms how many, before the record is written.
   *
   * Supplied by the workspace so a manual add asks the same question here and on a
   * drag into the Takeoff List — one prompt, one default, one place to change it.
   * The `+` beside a part passes a quantity of 1 it never asked the estimator for;
   * this is where that assumption gets checked.
   */
  askQuantity: (
    target: { name: string; code?: string; measurementType?: 'count' | 'linear'; unit?: string },
    commit: (qty: number) => void,
  ) => void;
}) {
  const [libraries] = useState<Library[]>(LIBRARIES);
  const [activeLibId, setActiveLibId] = useState('dollartree');
  const activeLib = libraries.find((l) => l.id === activeLibId)!;

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      {/*
        Says what this mode is and what it will do with the active context, once,
        at the top — rather than asking for a classification on every add.
      */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px', background: '#F8FBFF', borderBottom: '1px solid #E5E7EB', flexShrink: 0, flexWrap: 'wrap' }}>
        <Info size={12} color="#2563EB" style={{ flexShrink: 0 }} />
        <span style={{ fontSize: 11.5, color: '#374151' }}>
          Pick an assembly or part, then <strong>Add to Takeoff</strong> and enter a quantity.
          No drawing placement needed.
        </span>
        <span style={{ fontSize: 11, color: '#6B7280' }}>
          Records inherit <strong style={{ color: '#1D4ED8' }}>{classificationLabel(groups, activeCls)}</strong> from the bar above.
        </span>
        <div style={{ flex: 1, minWidth: 8 }} />
        <LibraryPicker libraries={libraries} activeId={activeLibId} onChange={setActiveLibId} />
      </div>

      {/*
        The Browse workspace itself. `takeoffMode` swaps the "Add to Takeoff"
        footer for one that writes a manual record and tells the estimator where it
        went; everything else in the component is untouched.

        `minHeight` and the scroll matter: Browse was built for a full-height page,
        and here it shares the window with the docked Takeoff List. Without a floor
        on its height the BOM panel's footer — which holds the Qty field and the Add
        button, the whole point of this mode — was clipped below the fold.
      */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        <div style={{ minHeight: 520, display: 'flex' }}>
        <ColumnLibraryView
          activeLib={activeLib}
          libraries={libraries}
          takeoffMode={{
            classificationLabel: classificationLabel(groups, activeCls),
            onAddAssembly: (asm: Assembly, stated?: number) => {
              const measure = defaultMeasureType(
                categoryOf(asm),
                `${asm.subcat ?? ''} ${asm.type ?? ''} ${asm.name}`,
              );
              const unit = measure === 'linear' ? 'LF' : 'EA';
              const write = (qty: number) => {
                addRecord({
                  sourceType: 'manual',
                  assemblyId: asm.id,
                  name: asm.name,
                  code: asm.code,
                  unit,
                  measurementType: measure,
                  quantity: measure === 'linear' ? 1 : qty,
                  measuredLength: measure === 'linear' ? qty : undefined,
                  classification: { ...activeCls },
                });
                onRecorded(asm.name, qty);
              };
              /* Asked already in the BOM footer? Honor it. Asking twice for the same
                 number is worse than never asking. */
              if (stated && stated > 0) write(stated);
              else askQuantity({ name: asm.name, code: asm.code, measurementType: measure, unit }, write);
            },
            onAddPart: (part: Part, stated?: number) => {
              const measure = part.unit === 'LF' ? 'linear' : 'count';
              const write = (qty: number) => {
                addRecord({
                  sourceType: 'manual',
                  partId: part.id,
                  name: part.name,
                  code: part.code,
                  unit: part.unit,
                  measurementType: measure,
                  quantity: measure === 'linear' ? 1 : qty,
                  measuredLength: measure === 'linear' ? qty : undefined,
                  classification: { ...activeCls },
                });
                onRecorded(part.name, qty);
              };
              if (stated && stated > 0) write(stated);
              else askQuantity({ name: part.name, code: part.code, measurementType: measure, unit: part.unit }, write);
            },
          }}
          />
        </div>
      </div>
    </div>
  );
}
