import os

filepath = 'src/components/NotificationWorkspace.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Change prop definition
content = content.replace('export default function NotificationWorkspace({ fieldPortal = false }: { fieldPortal?: boolean }) {', 'export default function NotificationWorkspace({ fieldPortal = false, hideSchedules = false }: { fieldPortal?: boolean; hideSchedules?: boolean }) {')

# Change canManageSchedules
content = content.replace('const canManageSchedules = !fieldPortal &&', 'const canManageSchedules = !fieldPortal && !hideSchedules &&')

# Change render conditions: `!fieldPortal &&` to `!fieldPortal && !hideSchedules &&`
content = content.replace('!fieldPortal && <button className="btn-primary text-xs" onClick={openCreateSchedule}>', '(!fieldPortal && !hideSchedules) && <button className="btn-primary text-xs" onClick={openCreateSchedule}>')
content = content.replace('{!fieldPortal && <>', '{(!fieldPortal && !hideSchedules) && <>')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated NotificationWorkspace")
