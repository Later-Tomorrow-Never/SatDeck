import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.178.0/build/three.module.js";
import { scene } from "../SatDeckWindow.js";

window.last_sat_id = -1;
window.data_ready = false;
window.cur_slot = 0;
const box_time = document.getElementById('hudTime');
const btnPlay = document.getElementById('btnPlay');
const btnPause = document.getElementById('btnPause');
const btnReset = document.getElementById('btnReset');
const IconPlay = document.getElementById('IconPlay');
const imgPlay = '../../../images/start.png';
const imgPause = '../../../images/pause.png'
const earthLoader = document.getElementById('earth_loader');
const networkContainer = document.getElementById('myNetwork');


const box_eci_x = document.getElementById('box_eci_x');
const box_eci_y = document.getElementById('box_eci_y');
const box_eci_z = document.getElementById('box_eci_z');

const box_ecef_x = document.getElementById('box_ecef_x');
const box_ecef_y = document.getElementById('box_ecef_y');
const box_ecef_z = document.getElementById('box_ecef_z');

const box_longitude = document.getElementById('box_longitude');
const box_latitude = document.getElementById('box_latitude');
const box_altitude = document.getElementById('box_altitude');

const box_speed = document.getElementById('box_speed');
const box_vx = document.getElementById('box_vx');
const box_vy = document.getElementById('box_vy');
const box_vz = document.getElementById('box_vz');






function CreateSatelliteMarker1(text = '') {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // 绘制正方形（底部）
    const squareSize = 50;
    const squareX = (width - squareSize) / 2;
    const squareY = height - squareSize - 5;

    ctx.fillStyle = 'red';
    ctx.fillRect(squareX, squareY, squareSize, squareSize);


    gradient.addColorStop(0, 'red'); // 在这里改颜色
    gradient.addColorStop(1, 'red');

    ctx.beginPath();
    ctx.moveTo(size / 2, 0);
    ctx.lineTo(0, size);
    ctx.lineTo(size, size);
    ctx.closePath();
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true, sizeAttenuation: true });



    ctx.fillStyle = 'white';
    ctx.font = `50px "Microsoft YaHei"`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, size / 2, size / 2);


    const sprite = new THREE.Sprite(material);
    sprite.scale.set(0.06, 0.06, 1); // 这里改大小
    scene.add(sprite);

    return sprite;
}

function CreateSatelliteMarker(text = '') {
    const width = 256;
    const height = 500;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // 绘制正方形（底部）
    const squareSize = 128;
    const squareX = (width - squareSize) / 2;
    const squareY = height - squareSize - 105;

    ctx.fillStyle = 'red';
    ctx.fillRect(squareX, squareY, squareSize, squareSize);

    // 文字（上方）
    if (text) {

        ctx.fillStyle = 'white';
        ctx.font = `bold 50px "Microsoft YaHei"`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, width / 2, squareY - 15);
    }

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true, sizeAttenuation: true });

    const sprite = new THREE.Sprite(material);
    sprite.scale.set(0.06, 0.075, 1);
    scene.add(sprite);

    return sprite;
}


//export const mySatellite = await CreateSatelliteMarker('test');

// 动画控制变量
let animationInterval = null;
//let positionsData = [];
//let neibours = [];

//let networkData = [];

let data = [];

let sprites = [];


async function load_data1() {
    try {
        earthLoader.classList.remove('hidden');
        let response = await fetch(`/api/sat_pos?sat_id=${sat_id}`);
        let result = await response.json();

        if (!result.success) {
            console.error('获取pos数据失败:', result.error);
            return;
        }
        positionsData = result.data;

        response = await fetch(`/api/network?slot_id=${cur_slot}&focus=${sat_id}`);
        result = await response.json();
        if (!result.success) {
            console.error('获取network数据失败:', result.error);
            return;
        }
        let nodes = new vis.DataSet(
            result.nodes.map(n => ({ id: n.id, label: n.name, title: '' }))
        );
        let edges = new vis.DataSet(
            result.edges.map(e => ({ from: e.from, to: e.to, label: e.rate.toFixed(2) + 'Mbps', value: e.rate }))
        );
        let data = { nodes: nodes, edges: edges };
        var options = {
            nodes: {
                shape: 'dot',
                size: 20,
                font: { size: 12, color: 'white' }
            },
            edges: {
                arrows: { to: true },
                font: { size: 12, color: 'white' }
            },
            physics: {
                solver: 'barnesHut',
                barnesHut: {
                    gravitationalConstant: -8000,  // 增大负值，斥力更强
                    centralGravity: 0.1,           // 减小中心引力
                    springLength: 200,              // 弹簧长度
                    springConstant: 0.04,           // 弹簧常数
                    damping: 0.09,
                    avoidOverlap: 0.5              // 避免重叠（0-1之间）
                },
                stabilization: { iterations: 500 }
            },
            interaction: { hover: true }
        };

        new vis.Network(networkContainer, data, options);


        earthLoader.classList.add('hidden');
    } catch (error) {
        console.error('请求失败:', error);
    }
}

async function load_data() {
    console.log('loading data');
    try {
        earthLoader.classList.remove('hidden');
        console.log(`url: /api/data?sat_id=${sat_id}`)
        let response = await fetch(`/api/data?sat_id=${sat_id}`);
        let result = await response.json();

        if (!result.success) {
            console.error('获取pos数据失败:', result.error);
            return;
        }

        data = result.data;
        //console.log(data);

        earthLoader.classList.add('hidden');

    } catch (error) {
        console.error('请求失败:', error);
    }
}











// 常数定义
const GMST_JD2000 = 280.46061837;    // 度
const GMST_DAY_FACTOR = 360.98564736629; // 度/天 (相对于 UT1 的近似)
const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

// WGS84 椭球参数
const a = 6378137.0;          // 赤道半径 (m)
const b = 6356752.314245;     // 极半径 (m)
const e2 = 1 - (b * b) / (a * a);   // 第一偏心率平方
const ep2 = (a * a) / (b * b) - 1;  // 第二偏心率平方

// 将 UTC 时间转换为儒略日 (JD)
function toJulianDay(date) {
    let year = date.getUTCFullYear();
    let month = date.getUTCMonth() + 1;
    let day = date.getUTCDate() +
        date.getUTCHours() / 24.0 +
        date.getUTCMinutes() / 1440.0 +
        date.getUTCSeconds() / 86400.0 +
        date.getUTCMilliseconds() / 86400000.0;

    if (month <= 2) {
        year -= 1;
        month += 12;
    }
    let A = Math.floor(year / 100);
    let B = 2 - A + Math.floor(A / 4);
    return Math.floor(365.25 * (year + 4716)) +
        Math.floor(30.6001 * (month + 1)) +
        day + B - 1524.5;
}

// 计算格林尼治恒星时 (GMST in degrees)
function getGMST(date) {
    let JD = toJulianDay(date);
    let T = (JD - 2451545.0) / 36525.0;  // 儒略世纪数 (J2000.0)
    // GMST 公式 (度)
    let GMST = 280.46061837 +
        360.98564736629 * (JD - 2451545.0) +
        0.000387933 * T * T -
        (T * T * T) / 38710000.0;
    GMST = GMST % 360;
    if (GMST < 0) GMST += 360;
    return GMST;
}

// 旋转矩阵 (绕 Z 轴)，ECI -> ECEF
function eciToEcef(x_eci, y_eci, z_eci, time) {
    let date = new Date(time);
    let gmst_deg = getGMST(date);
    let theta = gmst_deg * DEG2RAD;
    let cosTheta = Math.cos(theta);
    let sinTheta = Math.sin(theta);

    let x_ecef = x_eci * cosTheta + y_eci * sinTheta;
    let y_ecef = -x_eci * sinTheta + y_eci * cosTheta;
    let z_ecef = z_eci;

    return { x: x_ecef, y: y_ecef, z: z_ecef };
}

// ECEF -> LLA (纬度、经度、高度)
function ecefToLla(x, y, z) {

    // 经度
    let lon = Math.atan2(y, x);

    // 初始纬度估计
    let p = Math.sqrt(x * x + y * y);
    let lat = Math.atan2(z, p * (1 - e2));  // 初值

    // 迭代 (3次足够)
    for (let i = 0; i < 5; i++) {
        let sinLat = Math.sin(lat);
        let N = a / Math.sqrt(1 - e2 * sinLat * sinLat);
        let h = p / Math.cos(lat) - N;
        lat = Math.atan2(z, p * (1 - e2 * N / (N + h)));
    }

    // 最终高度
    let sinLat = Math.sin(lat);
    let N = a / Math.sqrt(1 - e2 * sinLat * sinLat);
    let h = p / Math.cos(lat) - N;

    return {
        lat: lat * RAD2DEG,
        lon: lon * RAD2DEG,
        alt_km: h / 1000.0
    };
}





let pre_eci_x = 0;
let pre_eci_y = 0;
let pre_eci_z = 0;


function ShowSatInHud(index) {
    //console.log(`ShowSatInHud(${index})`)
    const earthRadiusKm = 6378000; // 地球半径（m）
    // const nx = pos.eci_x / earthRadiusKm;
    // const ny = pos.eci_y / earthRadiusKm;
    // const nz = pos.eci_z / earthRadiusKm;
    // mySatellite.position.set(nx, ny, nz);
    if (!data[index]) return;
    let name, nx, ny, nz, tmp;

    sprites.forEach(s => {
        scene.remove(s);
    })

    tmp = data[index].nodes.self;
    sprites.push(
        CreateSatelliteMarker(
            tmp.name
        )
    );
    nx = tmp.eci_x / earthRadiusKm;
    ny = tmp.eci_y / earthRadiusKm;
    nz = tmp.eci_z / earthRadiusKm;
    sprites.at(-1).position.set(nx, ny, nz);
    //console.log(`setting sat ${tmp.sat_id}`);



    data[index].nodes.neibours.forEach(n => {
        sprites.push(CreateSatelliteMarker(n.name));
        nx = n.eci_x / earthRadiusKm;
        ny = n.eci_y / earthRadiusKm;
        nz = n.eci_z / earthRadiusKm;
        sprites.at(-1).position.set(nx, ny, nz);
        //console.log(`setting sat ${n.sat_id}`)
    });





}





// 更新卫星位置并显示时间
function updateValues(index) {
    if (!data[index]) return;

    const pos = data[index].nodes.self;
    let time = data[index].time

    box_time.textContent = time;


    box_eci_x.textContent = (pos.eci_x / 1000).toFixed(3);
    box_eci_y.textContent = (pos.eci_y / 1000).toFixed(3);
    box_eci_z.textContent = (pos.eci_z / 1000).toFixed(3);



    let ecef = eciToEcef(pos.eci_x, pos.eci_y, pos.eci_z, time);

    box_ecef_x.textContent = (ecef.x / 1000).toFixed(3);
    box_ecef_y.textContent = (ecef.y / 1000).toFixed(3);
    box_ecef_z.textContent = (ecef.z / 1000).toFixed(3);

    let LLA = ecefToLla(ecef.x, ecef.y, ecef.z);
    box_altitude.textContent = LLA.alt_km.toFixed(3);
    box_latitude.textContent = LLA.lat.toFixed(3);
    box_longitude.textContent = LLA.lon.toFixed(3);

    if (cur_slot == 0) {
        box_speed.textContent = '000';
        box_vx.textContent = '000';
        box_vy.textContent = '000';
        box_vz.textContent = '000';
    }
    else {
        let vx = (pos.eci_x - pre_eci_x) / 1000;
        let vy = (pos.eci_x - pre_eci_y) / 1000;
        let vz = (pos.eci_x - pre_eci_z) / 1000;
        let speed = 3.6 * Math.sqrt(vx * vx + vy * vy + vz * vz);
        box_speed.textContent = speed.toFixed(3);
        box_vx.textContent = vx.toFixed(3);
        box_vy.textContent = vy.toFixed(3);
        box_vz.textContent = vz.toFixed(3);
    }

    pre_eci_x = pos.eci_x;
    pre_eci_y = pos.eci_y;
    pre_eci_z = pos.eci_z;

}

var options = {
    nodes: {
        shape: 'dot',
        size: 20,
        font: { size: 12, color: 'white' }
    },
    edges: {
        arrows: { to: true },
        font: { size: 12, color: 'white' }
    },
    physics: {
        solver: 'barnesHut',
        barnesHut: {
            gravitationalConstant: -8000,  // 增大负值，斥力更强
            centralGravity: 0.1,           // 减小中心引力
            springLength: 200,              // 弹簧长度
            springConstant: 0.04,           // 弹簧常数
            damping: 0.09,
            avoidOverlap: 0.5              // 避免重叠（0-1之间）
        },
        stabilization: { iterations: 500 }
    },
    interaction: { hover: true }
};

function DrawNetwork(index) {
    console.log(`DrawNetwork(${index})`);
    if (!data[index]) return;

    let nodesMap = new Map();
    let item = data[index];

    // 添加自身节点
    let self = item.nodes.self;
    nodesMap.set(self.sat_id, { id: self.sat_id, label: self.name });

    // 添加邻居节点
    item.nodes.neibours.forEach(n => {
        if (!nodesMap.has(n.sat_id)) {
            nodesMap.set(n.sat_id, { id: n.sat_id, label: n.name });
        }
    });

    // 创建连线
    let edges = [];
    item.edges.forEach(e => {
        edges.push({ from: e.from, to: e.to, label: e.rate.toFixed(3) });
    });

    //console.log(nodesMap.size + '\n' + edges.length);

    // 渲染图
    let nodes = new vis.DataSet(Array.from(nodesMap.values()));
    let edgesSet = new vis.DataSet(edges);
    let dataSet = { nodes: nodes, edges: edgesSet };

    new vis.Network(networkContainer, dataSet, options);
}



// 开始动画
export async function startAnimation() {
    TogglePlayIcon();
    if (!data_ready || sat_id != last_sat_id) {
        await load_data();
        data_ready = true;
        last_sat_id = sat_id;
    }
    // 清除已存在的定时器
    if (animationInterval) {
        clearInterval(animationInterval);
        animationInterval = null;
    }

    function playNext() {
        if (cur_slot > data.length) {
            // 播放完成，自动暂停
            console.log('播放完成，自动暂停');
            stopAnimation();
            cur_slot = 0;
            return;
        }

        console.log(`playing ${cur_slot}`)
        ShowSatInHud(cur_slot);
        updateValues(cur_slot);
        DrawNetwork(cur_slot);

        cur_slot++;
    }

    // 立即播放第一帧
    playNext();
    // 设置定时器继续播放后续帧

    window.speed = document.getElementById('selectSpeed').value;

    animationInterval = setInterval(playNext, 1000 / speed);
}

// 停止动画
function stopAnimation() {
    if (animationInterval) {
        clearInterval(animationInterval);
        animationInterval = null;

    }
    TogglePlayIcon();
    console.log('pause');
}

// 重置动画
export function resetAnimation() {
    stopAnimation();
    cur_slot = 0;
    box_time.textContent = '';
    IconPlay.src = imgPlay;
    window.isPlaying = false;
    console.log('reset');
}






function TogglePlayIcon() {
    isPlaying = !isPlaying;
    if (isPlaying) {
        IconPlay.src = imgPause;
        btnPlay.onmouseenter = (e) => showTooltip(e, 'pause');
    } else {
        IconPlay.src = imgPlay;
        btnPlay.onmouseenter = (e) => showTooltip(e, 'play');
    }
    // 如果鼠标正在按钮上，立即更新 tooltip 文本
    if (btnPlay.matches(':hover')) {
        // 直接调用 showTooltip 更新文本
        showTooltip({ target: btnPlay }, isPlaying ? 'pause' : 'play');
    }
}




document.addEventListener('DOMContentLoaded', () => {
    window.isPlaying = false;

    function toggleAnimation() {
        if (window.sat_id == null) {
            alert('invalid sat_id');
            return;
        }
        if (isPlaying) {
            stopAnimation();
        } else {
            startAnimation();
        }

    }

    btnPlay.addEventListener('click', toggleAnimation);

    btnReset.addEventListener('click', resetAnimation);
});