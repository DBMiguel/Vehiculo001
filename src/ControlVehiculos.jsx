import React, { useState, useRef } from "react";
import * as XLSX from "xlsx";

export default function ControlVehiculos() {

  // --- Fecha local automática ---
  const obtenerFechaLocal = () => {
    const ahora = new Date();
    const pad = n => n.toString().padStart(2,"0");
    return `${ahora.getFullYear()}-${pad(ahora.getMonth()+1)}-${pad(ahora.getDate())}T${pad(ahora.getHours())}:${pad(ahora.getMinutes())}`;
  }

  // --- Formulario inicial ---
  const [form, setForm] = useState({
    fecha: obtenerFechaLocal(),
    vehiculo: "",
    placa: "",
    usuario: "",
    kilometrajeInicio: "",
    combustibleInicio: "",
    kilometrajeFin: "",
    combustibleFin: "",
    observaciones: "",
    fotoVehiculo: null,
    fotoConductor: null,
    otrasFotos: []
  });

  // --- Registros persistentes ---
  const [registros, setRegistros] = useState(()=>{
    const saved = localStorage.getItem("registrosVehiculos");
    return saved ? JSON.parse(saved) : [];
  });

  // --- Checklist ---
  const checklistBase = {
    Luces:true, Direccionales:true, Frenos:true, Claxon:true,
    Espejos:true, Llantas:true, Refacción:true, Gato:true,
    Herramienta:true, Limpieza:true, Documentos:true, Seguro:true
  };
  const [checklist,setChecklist] = useState(checklistBase);

  // --- Firmas ---
  const [firmaConductor,setFirmaConductor] = useState(null);
  const [firmaSupervisor,setFirmaSupervisor] = useState(null);
  const [mostrarFirmaConductor,setMostrarFirmaConductor] = useState(false);
  const [mostrarFirmaSupervisor,setMostrarFirmaSupervisor] = useState(false);
  const canvasConductorRef = useRef(null);
  const canvasSupervisorRef = useRef(null);
  const drawing = useRef(false);

  // --- Editar ---
  const [editIndex,setEditIndex] = useState(null);

  // --- Manejo inputs ---
  const handleChange = e=>{
    const {name,value,files} = e.target;
    if(name==="fotoVehiculo" && files.length>0){
      const reader = new FileReader();
      reader.onload = ()=>setForm(f=>({...f,fotoVehiculo:reader.result}));
      reader.readAsDataURL(files[0]);
    } else if(name==="fotoConductor" && files.length>0){
      const reader = new FileReader();
      reader.onload = ()=>setForm(f=>({...f,fotoConductor:reader.result}));
      reader.readAsDataURL(files[0]);
    } else if(name==="otrasFotos" && files.length>0){
      const fotosArray = Array.from(files);
      fotosArray.forEach(file=>{
        const reader = new FileReader();
        reader.onload = ()=>setForm(f=>({...f,otrasFotos:[...f.otrasFotos, reader.result]}));
        reader.readAsDataURL(file);
      });
    } else {
      setForm(f=>({...f,[name]:value}));
    }
  }

  const toggleChecklist = item=>setChecklist({...checklist,[item]:!checklist[item]});

  // --- Dibujo firmas ---
  const getPos = (e,canvas)=>{
    const rect = canvas.getBoundingClientRect();
    let x,y;
    if(e.touches){
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }
    return {x,y};
  }

  const comenzarDibujo = (e,tipo)=>{
    e.preventDefault();
    drawing.current=true;
    const canvas = tipo==="conductor"?canvasConductorRef.current:canvasSupervisorRef.current;
    const ctx = canvas.getContext("2d");
    const pos = getPos(e,canvas);
    ctx.beginPath(); ctx.moveTo(pos.x,pos.y);
  }

  const dibujar = (e,tipo)=>{
    e.preventDefault();
    if(!drawing.current) return;
    const canvas = tipo==="conductor"?canvasConductorRef.current:canvasSupervisorRef.current;
    const ctx = canvas.getContext("2d");
    const pos = getPos(e,canvas);
    ctx.lineTo(pos.x,pos.y); ctx.stroke();
  }

  const finalizarDibujo = e=>{
    e?.preventDefault(); drawing.current=false;
  }

  const limpiarCanvas = tipo=>{
    const canvas = tipo==="conductor"?canvasConductorRef.current:canvasSupervisorRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.lineWidth=2; ctx.lineCap="round"; ctx.strokeStyle="#000";
  }

  const guardarFirma = tipo=>{
    const canvas = tipo==="conductor"?canvasConductorRef.current:canvasSupervisorRef.current;
    const img = canvas.toDataURL("image/png");
    if(!img || img==="data:,"){ alert("Debe firmar antes de aceptar"); return; }
    tipo==="conductor"?setFirmaConductor(img):setFirmaSupervisor(img);
    tipo==="conductor"?setMostrarFirmaConductor(false):setMostrarFirmaSupervisor(false);
  }

  // --- Guardar registro ---
  const guardarRegistro = ()=>{
    if(!firmaConductor || !firmaSupervisor){ alert("Se requieren ambas firmas"); return; }
    const registro = {...form,checklist,firmaConductor,firmaSupervisor,fechaRegistro:new Date().toLocaleString()};
    let nuevosRegistros = editIndex!==null?[...registros]:[...registros,registro];
    if(editIndex!==null){ nuevosRegistros[editIndex]=registro; setEditIndex(null);}
    setRegistros(nuevosRegistros);
    localStorage.setItem("registrosVehiculos",JSON.stringify(nuevosRegistros));
    setForm({...form,fecha:obtenerFechaLocal(),vehiculo:"",placa:"",usuario:"",kilometrajeInicio:"",combustibleInicio:"",kilometrajeFin:"",combustibleFin:"",observaciones:"",fotoVehiculo:null,fotoConductor:null,otrasFotos:[]});
    setChecklist(checklistBase); setFirmaConductor(null); setFirmaSupervisor(null);
  }

  const editarRegistro=i=>{
    const r=registros[i];
    setForm({...r}); 
    setChecklist(r.checklist); 
    setFirmaConductor(r.firmaConductor); 
    setFirmaSupervisor(r.firmaSupervisor);
    setEditIndex(i);
  }

  const borrarRegistro=i=>{
    if(!window.confirm("¿Borrar este registro?")) return;
    const nuevosRegistros=registros.filter((_,idx)=>idx!==i);
    setRegistros(nuevosRegistros);
    localStorage.setItem("registrosVehiculos",JSON.stringify(nuevosRegistros));
  }

  const exportarExcel=()=>{
    const data=registros.map((r,i)=>({
      No:i+1, Fecha:r.fecha, Vehiculo:r.vehiculo, Placa:r.placa, Usuario:r.usuario,
      KmInicio:r.kilometrajeInicio, CombustibleInicial:r.combustibleInicio,
      KmFinal:r.kilometrajeFin, CombustibleFinal:r.combustibleFin,
      FirmaConductor:r.firmaConductor?"Sí":"No", FirmaSupervisor:r.firmaSupervisor?"Sí":"No",
      Observaciones:r.observaciones
    }));
    const ws=XLSX.utils.json_to_sheet(data);
    const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,ws,"Registros");
    XLSX.writeFile(wb,"control_vehiculos.xlsx");
  }

  const colorTarjeta=r=>{
    if(r.firmaConductor && r.firmaSupervisor) return "#d4edda";
    if(r.firmaConductor) return "#fff3cd";
    if(r.firmaSupervisor) return "#cce5ff";
    return "#f8d7da";
  }

  return (
    <div className="container">
      <h1>Control de Vehículos</h1>

      <form>
        <input type="datetime-local" name="fecha" value={form.fecha} onChange={handleChange} />
        <input name="vehiculo" placeholder="Vehículo" value={form.vehiculo} onChange={handleChange} />
        <input name="placa" placeholder="Placa" value={form.placa} onChange={handleChange} />
        <input name="usuario" placeholder="Usuario" value={form.usuario} onChange={handleChange} />
        <input name="kilometrajeInicio" placeholder="Km Inicial" value={form.kilometrajeInicio} onChange={handleChange} />
        <select name="combustibleInicio" value={form.combustibleInicio} onChange={handleChange}>
          <option value="">Combustible inicial</option><option>Vacío</option><option>1/4</option><option>1/2</option><option>3/4</option><option>Lleno</option>
        </select>
        <input name="kilometrajeFin" placeholder="Km Final" value={form.kilometrajeFin} onChange={handleChange} />
        <select name="combustibleFin" value={form.combustibleFin} onChange={handleChange}>
          <option value="">Combustible final</option><option>Vacío</option><option>1/4</option><option>1/2</option><option>3/4</option><option>Lleno</option>
        </select>
        <textarea name="observaciones" placeholder="Observaciones" value={form.observaciones} onChange={handleChange}/>

        <label>Foto Vehículo:</label>
        <input type="file" accept="image/*" name="fotoVehiculo" onChange={handleChange} />
        {form.fotoVehiculo && <img src={form.fotoVehiculo} width={200} style={{margin:"5px 0"}}/>}

        <label>Foto Conductor:</label>
        <input type="file" accept="image/*" name="fotoConductor" onChange={handleChange} />
        {form.fotoConductor && <img src={form.fotoConductor} width={150} style={{margin:"5px 0"}}/>}

        <label>Otras Fotos:</label>
        <input type="file" accept="image/*" name="otrasFotos" onChange={handleChange} multiple />
        {form.otrasFotos && form.otrasFotos.map((f,j)=><img key={j} src={f} width={100} style={{marginRight:"5px"}}/>)}
      </form>

      <h3>Checklist</h3>
      <div className="checklist">{Object.keys(checklist).map(i=><label key={i}>{i}<input type="checkbox" checked={checklist[i]} onChange={()=>toggleChecklist(i)} /></label>)}</div>

      <h3>Firmas</h3>
      <div className="acciones">
        <button className="btn btn-conductor" onClick={()=>setMostrarFirmaConductor(true)}>Firma Conductor</button>
        <button className="btn btn-supervisor" onClick={()=>setMostrarFirmaSupervisor(true)}>Firma Supervisor</button>
      </div>

      {/* Modal firma conductor */}
      {mostrarFirmaConductor && (
        <div className="modal-firma">
          <h4>Firma del Conductor</h4>
          <canvas
            ref={canvasConductorRef}
            width={400} 
            height={150}
            style={{width:"100%"}}
            onMouseDown={(e)=>comenzarDibujo(e,"conductor")}
            onMouseMove={(e)=>dibujar(e,"conductor")}
            onMouseUp={finalizarDibujo}
            onMouseLeave={finalizarDibujo}
            onTouchStart={(e)=>comenzarDibujo(e,"conductor")}
            onTouchMove={(e)=>dibujar(e,"conductor")}
            onTouchEnd={finalizarDibujo}
          />
          <button className="btn btn-guardar" onClick={()=>guardarFirma("conductor")}>Guardar</button>
          <button className="btn btn-cancelar" onClick={()=>setMostrarFirmaConductor(false)}>Cancelar</button>
          <button className="btn btn-limpiar" onClick={()=>limpiarCanvas("conductor")}>Limpiar</button>
        </div>
      )}

      {/* Modal firma supervisor */}
      {mostrarFirmaSupervisor && (
        <div className="modal-firma">
          <h4>Firma del Supervisor</h4>
          <canvas
            ref={canvasSupervisorRef}
            width={400} 
            height={150}
            style={{width:"100%"}}
            onMouseDown={(e)=>comenzarDibujo(e,"supervisor")}
            onMouseMove={(e)=>dibujar(e,"supervisor")}
            onMouseUp={finalizarDibujo}
            onMouseLeave={finalizarDibujo}
            onTouchStart={(e)=>comenzarDibujo(e,"supervisor")}
            onTouchMove={(e)=>dibujar(e,"supervisor")}
            onTouchEnd={finalizarDibujo}
          />
          <button className="btn btn-guardar" onClick={()=>guardarFirma("supervisor")}>Guardar</button>
          <button className="btn btn-cancelar" onClick={()=>setMostrarFirmaSupervisor(false)}>Cancelar</button>
          <button className="btn btn-limpiar" onClick={()=>limpiarCanvas("supervisor")}>Limpiar</button>
        </div>
      )}

      <div className="acciones">
        <button className="btn btn-guardar" onClick={guardarRegistro}>Guardar registro</button>
        <button className="btn btn-exportar" onClick={exportarExcel}>Exportar Excel</button>
      </div>

      <h3>Registros</h3>
      <div className="grid">
        {registros.map((r,i)=>(
          <div key={i} className="card" style={{backgroundColor:colorTarjeta(r)}}>
            <p><strong>{r.fechaRegistro}</strong> — {r.vehiculo} ({r.placa})</p>
            <p>Usuario: {r.usuario}</p>
            <p>Kilometraje: {r.kilometrajeInicio} → {r.kilometrajeFin}</p>
            <p>Combustible: {r.combustibleInicio} → {r.combustibleFin}</p>
            <p>Observaciones: {r.observaciones}</p>
            <p>Checklist: {Object.keys(r.checklist).filter(k=>r.checklist[k]).join(", ")}</p>
            {r.fotoVehiculo && <p>Foto Vehículo:<br/><img src={r.fotoVehiculo} width={200}/></p>}
            {r.fotoConductor && <p>Foto Conductor:<br/><img src={r.fotoConductor} width={150}/></p>}
            {r.otrasFotos && r.otrasFotos.map((f,j)=><img key={j} src={f} width={100} style={{marginRight:"5px"}}/>)}
            {r.firmaConductor && <p>Conductor:<br/><img src={r.firmaConductor} width={150}/></p>}
            {r.firmaSupervisor && <p>Supervisor:<br/><img src={r.firmaSupervisor} width={150}/></p>}
            <div className="acciones-registro">
              <button className="btn btn-editar" onClick={()=>editarRegistro(i)}>Editar</button>
              <button className="btn btn-borrar" onClick={()=>borrarRegistro(i)}>Borrar</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
