from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import sqlite3


app = Flask(__name__)
CORS(app)  # 允许前端跨域访问

def get_db_connection():
    """获取数据库连接"""
    conn = sqlite3.connect('data.db')
    conn.row_factory = sqlite3.Row  # 让查询结果返回字典格式
    return conn

@app.route('/api/query', methods=['GET', 'POST'])
def query():
    """执行 SQL 查询"""
    try:
        if request.method == 'GET':
            sql = request.args.get('sql', '')
        else:
            sql = request.json.get('sql', '')
        
        if not sql:
            return jsonify({'error': '请提供 SQL 语句'}), 400
        
        # 安全检查：只允许 SELECT 查询
        if not sql.strip().upper().startswith('SELECT'):
            return jsonify({'error': '只允许 SELECT 查询'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(sql)
        rows = cursor.fetchall()
        
        # 转换为字典列表
        results = [dict(row) for row in rows]
        
        conn.close()


        # return results
        return jsonify({
            'success': True,
            'count': len(results),
            'sql': sql,
            'data': results
        })
        
    except sqlite3.Error as e:
        return jsonify({'error': f'SQL错误: {str(e)}'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/tables', methods=['GET'])
def get_tables():
    """获取所有表名"""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = [row[0] for row in cursor.fetchall()]
    conn.close()
    return jsonify({'tables': tables})

@app.route('/api/schema/<table_name>', methods=['GET'])
def get_schema(table_name):
    """获取表结构"""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(f"PRAGMA table_info({table_name})")
    schema = cursor.fetchall()
    conn.close()
    return jsonify({'schema': [dict(row) for row in schema]})

@app.route('/')
def serve_index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('.', path)

@app.route('/api/test')
def test():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT DISTINCT sat_id, name FROM sat_positions')
        return jsonify({'success':True})
    except Exception as e:
        print(f"错误信息: {e}")  # 打印到控制台
        import traceback
        traceback.print_exc()  # 打印完整堆栈
        return jsonify({'success':False, 'error':str(e)})  # 返回具体错误






@app.route('/api/sat_list')
def get_sat_list():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        #cursor.execute('SELECT DISTINCT sat_id, name FROM sat_positions')
        cursor.execute('''
            SELECT sat_id, MIN(name) as name 
            FROM sat_positions 
            GROUP BY sat_id
            ORDER BY sat_id
        ''')
        d = []
        for row in cursor.fetchall():
            d.append({'sat_id':row[0],'sat_name':row[1]})
        conn.close()
        return jsonify({
                'success': True,
                'data': d  # 直接返回一维列表
        })
    except Exception as e:
        print(f"错误信息: {e}")  # 打印到控制台
        import traceback
        traceback.print_exc()  # 打印完整堆栈
        return jsonify({'success':False, 'error':str(e)})  # 返回具体错误



@app.route('/api/sat_pos',methods = ['GET'])
def get_sat_pos():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        sat_id = request.args.get('sat_id', 0)
        d = []
        cursor.execute(f'select eci_x,eci_y,eci_z,slot_id from sat_positions where sat_id={sat_id} order by slot_id')
        for row in cursor.fetchall():
            cursor2 = conn.cursor()
            cursor2.execute(f'select timestamp from sat_slots where slot_id={row[3]} limit 1')
            tmp = cursor2.fetchone()
            d.append({'eci_x':row[0],'eci_y':row[1],'eci_z':row[2],'time':tmp[0]})
        return jsonify({'success':True,'data':d})
    except Exception as e:
        print(f"错误信息: {e}")  # 打印到控制台
        import traceback
        traceback.print_exc()  # 打印完整堆栈
        return jsonify({'success':False, 'error':str(e)})  # 返回具体错误

@app.route('/api/network',methods = ['GET'])
def get_network():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        d = []
        _mapping = {}
        
        cursor.execute('select slot_id from sat_slots order by slot_id')
        cur2 = conn.cursor()
        cur3 = conn.cursor()
        for ro in cursor.fetchall():
            nodes_set = set()
            edges = []
            nodes = []
            slot_id = ro['slot_id']
            cur2.execute(f'select * from links where slot_id = {slot_id}')
            for row in cur2.fetchall():
                link = {
                    'from':row['src'],
                    'to':row['dst'],
                    'rate':row['bandwidth_mbps']
                }
                nodes_set.add(row['src'])
                nodes_set.add(row['dst'])
                
                if row['state']=='up': 
                    edges.append(link) 
            for node_id in nodes_set:
                if node_id not in _mapping:
                    cur3.execute(f'select name from sat_positions where sat_id = {node_id} limit 1')
                    _mapping[node_id] = cur3.fetchone()[0]
                nodes.append({
                    'id':node_id,
                    'name':_mapping[node_id]
                })
            
            d.append({
                'nodes':nodes,
                'edges':edges
            })
            






        conn.close()

        return jsonify({
            'success':True,
            'data':d
        })
    except Exception as e:
        print(f"错误信息: {e}")  # 打印到控制台
        import traceback
        traceback.print_exc()  # 打印完整堆栈
        return jsonify({'success':False, 'error':str(e)})  # 返回具体错误


@app.route('/api/data',methods = ['GET'])
def get_data():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cur2 = conn.cursor()
        sat_id = request.args.get('sat_id',type=int)
        data = []
        cursor.execute('select slot_id,timestamp from sat_slots order by slot_id')
        for ro in cursor.fetchall():
            slot_id = ro['slot_id']
            time = ro['timestamp']
            nodes = {}
            nodes['neibours'] = []
            edges = []
            nodeSet = set()
            #nodeSet.add(sat_id)
            cur2.execute(f'select * from links where slot_id = {slot_id}')
            for row in cur2.fetchall():
                if row['state']!='up': 
                    continue
                link = {
                    'from':row['src'],
                    'to':row['dst'],
                    'rate':row['bandwidth_mbps']
                }
                if link['from']==sat_id:
                    nodeSet.add(link['to'])
                    edges.append(link)
                if link['to']==sat_id:
                    nodeSet.add(link['from'])
                    edges.append(link)
            cur2.execute(f'select name,eci_x,eci_y,eci_z from sat_positions where slot_id = {slot_id} and sat_id = {sat_id} limit 1')
            res = cur2.fetchone()
            if res is None: continue
            nodes['self'] = {
                'sat_id':sat_id,
                'name':res[0],
                'eci_x':res[1],
                'eci_y':res[2],
                'eci_z':res[3]
            }
            for id in nodeSet:
                cur2.execute(f'select name,eci_x,eci_y,eci_z from sat_positions where slot_id = {slot_id} and sat_id = {id} limit 1')
                res = cur2.fetchone()
                nodes['neibours'].append({
                    'sat_id':id,
                    'name':res[0],
                    'eci_x':res[1],
                    'eci_y':res[2],
                    'eci_z':res[3]
                })
            data.append({
                'slot_id':slot_id,
                'time':time,
                #'nodeSet':list(nodeSet),
                'nodes':nodes,
                'edges':edges
            })


        return {
            'success':True,
            'data':data
        }
    except Exception as e:
        print(f"错误信息: {e}")  # 打印到控制台
        import traceback
        traceback.print_exc()  # 打印完整堆栈
        return jsonify({'success':False, 'error':str(e)})  # 返回具体错误








if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=8000)
