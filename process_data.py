import sqlite3
import json
import os
from datetime import datetime
import time

##################  检测下面的路径  ######################
#sat_positions_jsonl = './data/sample_sat_positions.jsonl'
sat_positions_jsonl = './data/sat_positions.jsonl'
#links_jsonl = './data/sample_slots_full.jsonl'
links_jsonl = './data/slots_full.jsonl'




conn = sqlite3.connect('data.db')
cursor = conn.cursor()


##################  建表  ######################

# 1. 创建主表
cursor.execute('''
    CREATE TABLE IF NOT EXISTS sat_slots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        slot_id INTEGER NOT NULL,
        timestamp TEXT NOT NULL
    )
''')

# 2. 创建位置子表
cursor.execute('''
    CREATE TABLE IF NOT EXISTS sat_positions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        slot_id INTEGER NOT NULL,
        sat_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        eci_x REAL NOT NULL,
        eci_y REAL NOT NULL,
        eci_z REAL NOT NULL,
        FOREIGN KEY (slot_id) REFERENCES sat_slots(slot_id)
    )
''')






cursor.execute('''
    CREATE TABLE IF NOT EXISTS links (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        slot_id INTEGER NOT NULL,
        timestamp TEXT NOT NULL,
        state TEXT NOT NULL,
        src INTEGER NOT NULL,
        dst INTEGER NOT NULL,
        bandwidth_mbps REAL
    )
''')


# 3. 创建索引
# 索引的作用：加速 WHERE 条件查询，例如 WHERE slot_id = 5 会非常快。
cursor.execute('CREATE INDEX IF NOT EXISTS idx_slot_id ON sat_slots(slot_id)')
cursor.execute('CREATE INDEX IF NOT EXISTS idx_pos_slot_id ON sat_positions(slot_id)')
cursor.execute('CREATE INDEX IF NOT EXISTS idx_sat_id ON sat_positions(sat_id)')
cursor.execute("CREATE INDEX IF NOT EXISTS idx_slot_time ON links(slot_id)")

conn.commit()

#################  导入数据  ######################

batch_size = 5000
batch_slots = []
batch_positions = []

def flush_batch():
    """批量提交数据"""
    global batch_slots, batch_positions
    
    if not batch_slots:
        return
    
    try:
        # 批量插入主表记录
        cursor.executemany('''
            INSERT INTO sat_slots (slot_id, timestamp)
            VALUES (?, ?)
        ''', batch_slots)
        
        # 批量插入位置记录
        cursor.executemany('''
            INSERT INTO sat_positions (slot_id, sat_id, name, eci_x, eci_y, eci_z)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', batch_positions)
        
        # 提交事务
        conn.commit()
        
        # 清空批次缓存
        batch_slots = []
        batch_positions = []
        
    except Exception as e:
        print(f"批量插入失败: {e}")
        conn.rollback()
        raise


print('loading sat positions...\n')
with open(sat_positions_jsonl,'r',encoding='utf-8') as f:
    line_cnt = 0
    for line in f:
        line = line.strip()
        if not line: continue
        data = json.loads(line)
        slot_id = data.get('slot_id')
        timestamp = data.get('timestamp')
        positions = data.get('positions', [])

        # 添加主表记录
        batch_slots.append((slot_id, timestamp))
        
        # 添加位置记录
        for pos in positions:
            sat_id = pos.get('sat_id')
            name = pos.get('name')
            eci = pos.get('eci_m')
            eci_x, eci_y, eci_z = eci[0], eci[1], eci[2]
            
            batch_positions.append((slot_id, sat_id, name, eci_x, eci_y, eci_z))

        line_cnt += 1
        now = datetime.now()
        print(f'\r[{now.hour:02d}:{now.minute:02d}:{now.second:02d}] {line_cnt} lines has been read',end='',flush=True)
        #time.sleep(2)

        if len(batch_slots) == batch_size:
            flush_batch()

if batch_slots:
    flush_batch()

print('\n\nsat positions loaded successfully!\n\n')


















### links
batch = []
cnt = 0
print('loading links...\n')
with open(links_jsonl,'r',encoding='utf-8') as f:
    for line in f:
        line = line.strip()
        if not line: continue
        data = json.loads(line)
        slot_id = data.get('slot_id')
        timestamp = data.get('timestamp')
        links = data.get('links')
        for link in links:
            state = link.get('state')
            src = link.get('src')
            dst = link.get('dst')
            bandwidth_mbps = link.get('bandwidth_mbps')
            batch.append((slot_id, timestamp, state, src, dst, bandwidth_mbps))
        if len(batch) >= batch_size:
            cursor.executemany('''
                INSERT INTO links (slot_id, timestamp, state, src, dst, bandwidth_mbps)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', batch)
            conn.commit()
            batch = []
        cnt+=1
        print(f'\r[{datetime.now().strftime("%H:%M:%S")}] {cnt} lines has been read',end='',flush=True)
        #time.sleep(2)
        
if batch:
    cursor.executemany('''
        INSERT INTO links (slot_id, timestamp, state, src, dst, bandwidth_mbps)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', batch)
    conn.commit()

print('\n\nlinks loaded successfully!\n')



conn.close()
