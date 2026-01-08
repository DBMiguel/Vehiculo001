import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import html2canvas from "html2canvas";
import './index.css';

export default function ControlVehiculos() {
  const [registros, setRegistros] = useState(() => {
    const saved = localStorage.getItem("vehiculos");
    return saved ? JSON.parse(saved) : [];
  });

  const [form, setForm] = useState({
    vehiculo:"", placa:"", usuario:"", combustible:"",
    kilometrajeInicio:"", kilometrajeFin:"", estadoVehiculo:"", comentarios:"",
    fotos:[], fecha:new Date().toISOString().slice(0,16),
    checklist:{ llantas:"ok",tanque:"ok",luces:"ok",gato:"ok",otros:"ok",
                frenos:"ok",aceite:"ok",parabrisas:"ok",limpieza:"ok" },
    firmaRecepcion:"", firmaEntrega:"", fotoRecepcion:"", fotoEntrega:""
  });

  const [editIndex, setEditIndex] = useState(null);

  const canvasRecepcionRef = useRef(null);
  const canvasEntregaRef = useRef(null);
  const dibujando = useRef(false);

  const [firmaVisible, setFirmaVisible] = useState({tipo:"", visible:false});
  const checklistRef = useRef(null);

  // --- Cambio de inputs ---
  const handleChange = (e) => {
    const { name, value, type, files } = e.target;
    if(type==="file"){
      const imgs = Array.from(files).map(f => URL.createObjectURL(f));
      if(name==="fotos") setForm({...form, fotos:[...form.fotos,...imgs]});
      else setForm({...form, [name]:imgs[0]});
    } else setForm({...form, [name]:value});
  };

  const handleChecklist = (e) => {
    const { name, value } = e.target;
    setForm({...form, checklist:{...form.checklist,[name]:value}});
  };

  // --- Firmas ---
  const iniciarFirma = (e,tipo) => { e.preventDefault(); dibujando.current=true; dibujarFirma(e,tipo); };
  const terminarFirma = (e,tipo) => { e&&e.preventDefault(); dibujando.current=false; const ref = tipo==="recepcion"?canvasRecepcionRef:canvasEntregaRef; ref.current.getContext("2d").beginPath(); };
  const dibujarFirma = (e,tipo) => {
    e.preventDefault();
    if(!dibujando.current) return;
    const ref = tipo==="recepcion"?canvasRecepcionRef:canvasEntregaRef;
    const canvas = ref.current; const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches?e.touches[0].clientX:e.clientX)-rect.left;
    const y = (e.touches?e.touches[0].clientY:e.clientY)-rect.top;
    ctx.lineWidth=2; ctx.lineCap="round"; ctx.lineTo(x,y); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x,y);
  };

  const abrirFirma = (tipo) => setFirmaVisible({tipo, visible:true});
  const borrarFirma = (tipo) => { const ref = tipo==="recepcion"?canvasRecepcionRef:canvasEntregaRef; ref.current.getContext("2d").clearRect(0,0,ref.current.width,ref.current.height); };
  const aceptarFirma = (tipo) => {
    const ref = tipo==="recepcion"?canvasRecepcionRef:canvasEntregaRef;
    const img = ref.current.toDataURL();
    if(!img || img==="data:,"){ alert("Debe firmar antes de aceptar"); return; }
    setForm({...form, [tipo==="recepcion"?"firmaRecepcion":"firmaEntrega"]:img});
    setFirmaVisible({tipo:"", visible:false});
  };

  // --- Guardar registro ---
  const guardarRegistro = (e) => {
    e.preventDefault();
    if(!form.firmaRecepcion || !form.firmaEntrega){
      alert("Ambas firmas son obligatorias"); return;
    }
    const nuevo = {...form, fecha:new Date(form.fecha).toLocaleString()};
    if(editIndex!==null){
      const nuevos = [...registros]; nuevos[editIndex]=nuevo; setRegistros(nuevos); setEditIndex(null);
    } else setRegistros([...registros,nuevo]);

    setForm({ vehiculo:"", placa:"", usuario:"", combustible:"",
      kilometrajeInicio:"", kilometrajeFin:"", estadoVehiculo:"", comentarios:"",
      fotos:[], fecha:new Date().toISOString().slice(0,16),
      checklist:{ llantas:"ok",tanque:"ok",luces:"ok",gato:"ok",otros:"ok",
                  frenos:"ok",aceite:"ok",parabrisas:"ok",limpieza:"ok" },
      firmaRecepcion:"", firmaEntrega:"", fotoRecepcion:"", fotoEntrega:""
    });

    borrarFirma("recepcion"); borrarFirma("entrega");
  };

  // --- Borrar / Editar registros ---
  const borrarRegistroIndividual = (i) => { if(window.confirm("¿Borrar este registro?")) setRegistros(registros.filter((_,idx)=>idx!==i)); };
  const editarRegistro = (i) => { const r = registros[i]; setForm({...r, fecha:new Date(r.fecha).toISOString().slice(0,16)}); setEditIndex(i); };
  const borrarTodosRegistros = () => { if(window.confirm("¿Borrar todos?")) setRegistros([]); };

  // --- Exportar Excel ---
  const exportarExcel = () => {
    if(registros.length===0){ alert("No hay registros"); return; }
    const datos = registros.map(r=>({
      Fecha:r.fecha, Vehiculo:r.vehiculo, Placa:r.placa, Usuario:r.usuario, Combustible:r.combustible,
      KilometrajeInicio:r.kilometrajeInicio, KilometrajeFin:r.kilometrajeFin, Estado:r.estadoVehiculo,
      Comentarios:r.comentarios,
      FotoRecepcion: r.fotoRecepcion ? "Sí" : "No",
      FotoEntrega: r.fotoEntrega ? "Sí" : "No",
      FirmaRecepcion:r.firmaRecepcion ? "Sí" : "No",
      FirmaEntrega:r.firmaEntrega ? "Sí" : "No",
      Llantas:r.checklist.llantas, Tanque:r.checklist.tanque, Luces:r.checklist.luces,
      Gato:r.checklist.gato, Otros:r.checklist.otros, Frenos:r.checklist.frenos,
      Aceite:r.checklist.aceite, Parabrisas:r.checklist.parabrisas, Limpieza:r.checklist.limpieza
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(datos);
    XLSX.utils.book_append_sheet(wb, ws, "Registros");
    const archivo = XLSX.write(wb,{bookType:"xlsx", type:"array"});
    saveAs(new Blob([archivo],{type:"application/octet-stream"}),"ControlVehicular.xlsx");
  };

  // --- Borrar foto individual ---
  const borrarFotoIndividual = (name) => setForm({...form,[name]:""});

  return (
    <div className="container">
      <h1>Control Vehicular</h1>
      <form onSubmit={guardarRegistro}>
        <input name="vehiculo" placeholder="Vehículo" value={form.vehiculo} onChange={handleChange} required/>
        <input name="placa" placeholder="Placa / Serie" value={form.placa} onChange={handleChange}/>
        <input name="usuario" placeholder="Usuario" value={form.usuario} onChange={handleChange} required/>
        <input name="kilometrajeInicio" placeholder="Km Inicial" value={form.kilometrajeInicio} onChange={handleChange}/>
        <input name="kilometrajeFin" placeholder="Km Final" value={form.kilometrajeFin} onChange={handleChange}/>
        <select name="combustible" value={form.combustible} onChange={handleChange} required>
          <option value="">Combustible</option>
          <option>Vacío</option><option>1/4</option><option>1/2</option><option>3/4</option><option>Lleno</option>
        </select>
        <input name="estadoVehiculo" placeholder="Estado / daños / refacción / gato" value={form.estadoVehiculo} onChange={handleChange}/>
        <input type="datetime-local" name="fecha" value={form.fecha} onChange={handleChange}/>

        <label>Foto del vehículo <input type="file" name="fotos" accept="image/*" capture="environment" onChange={handleChange}/></label>
        <label>Foto quien recibe <input type="file" name="fotoRecepcion" accept="image/*" capture="user" onChange={handleChange}/></label>
        <label>Foto quien entrega <input type="file" name="fotoEntrega" accept="image/*" capture="user" onChange={handleChange}/></label>

        <div className="fotos">
          {form.fotos && <img src={form.fotos} alt="foto" width={60}/>}
          {form.fotoRecepcion && <img src={form.fotoRecepcion} alt="recepcion" width={60}/>}
          {form.fotoEntrega && <img src={form.fotoEntrega} alt="entrega" width={60}/>}
        </div>

        <textarea name="comentarios" placeholder="Comentarios" value={form.comentarios} onChange={handleChange}/>

        <div className="checklist" ref={checklistRef}>
          <h3>Check-list de revisión</h3>
          {Object.keys(form.checklist).map(item=>(
            <label key={item}>
              <span>{item.charAt(0).toUpperCase()+item.slice(1)}</span>
              <span>
                <select name={item} value={form.checklist[item]} onChange={handleChecklist}>
                  <option value="ok">✅ Todo OK</option>
                  <option value="mal">❌ Mal estado</option>
                </select>
              </span>
            </label>
          ))}
        </div>

        <div className="firmas">
          <button type="button" className="firma" onClick={()=>abrirFirma("recepcion")}>Firmar recepción</button>
          <button type="button" className="firma" onClick={()=>abrirFirma("entrega")}>Firmar entrega</button>

          {firmaVisible.tipo && firmaVisible.visible && (
            <div className="modal-firma">
              <canvas ref={firmaVisible.tipo==="recepcion"?canvasRecepcionRef:canvasEntregaRef} width={400} height={150}
                onMouseDown={(e)=>iniciarFirma(e,firmaVisible.tipo)}
                onMouseMove={(e)=>dibujarFirma(e,firmaVisible.tipo)}
                onMouseUp={(e)=>terminarFirma(e,firmaVisible.tipo)}
                onMouseLeave={(e)=>terminarFirma(e,firmaVisible.tipo)}
                onTouchStart={(e)=>iniciarFirma(e,firmaVisible.tipo)}
                onTouchMove={(e)=>dibujarFirma(e,firmaVisible.tipo)}
                onTouchEnd={(e)=>terminarFirma(e,firmaVisible.tipo)}
              />
              <button type="button" className="save" onClick={()=>aceptarFirma(firmaVisible.tipo)}>Aceptar</button>
              <button type="button" className="delete" onClick={()=>borrarFirma(firmaVisible.tipo)}>Borrar</button>
            </div>
          )}
        </div>

        <div>
          <button type="submit" className="save">Guardar</button>
          <button type="button" className="export" onClick={()=>html2canvas(checklistRef.current).then(c=>window.open(c.toDataURL()))}>Generar imagen checklist</button>
        </div>
      </form>

      <div>
        <button className="delete" onClick={borrarTodosRegistros}>Borrar todos</button>
        <button className="export" onClick={exportarExcel}>Exportar Excel</button>
      </div>

      <div className="grid">
        {registros.map((r,i)=>(
          <div key={i} className="card">
            <p><strong>{r.fecha}</strong> — {r.vehiculo} ({r.placa})</p>
            <p>Usuario: {r.usuario}</p>
            <p>Kilometraje: {r.kilometrajeInicio} → {r.kilometrajeFin}</p>
            <p>Combustible: {r.combustible}</p>
            <p>Estado: {r.estadoVehiculo}</p>
            {r.comentarios && <p>Comentarios: {r.comentarios}</p>}
            {r.fotos && <img src={r.fotos} alt="foto" width={50}/>}
            {r.fotoRecepcion && <img src={r.fotoRecepcion} alt="recepcion" width={50}/>}
            {r.fotoEntrega && <img src={r.fotoEntrega} alt="entrega" width={50}/>}
            {r.firmaRecepcion && <p>Firma recepción:<br/><img src={r.firmaRecepcion} width={150}/></p>}
            {r.firmaEntrega && <p>Firma entrega:<br/><img src={r.firmaEntrega} width={150}/></p>}
            <div>
              <button className="edit" onClick={()=>editarRegistro(i)}>Editar</button>
              <button className="delete" onClick={()=>borrarRegistroIndividual(i)}>Borrar</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
