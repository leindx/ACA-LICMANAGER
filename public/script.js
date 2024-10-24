document.addEventListener('DOMContentLoaded', function() {
    const clienteSelect = document.getElementById('clienteSelect');
    const clienteGestion = document.getElementById('clienteGestion');
    const clienteEstadoMensual = document.getElementById('clienteEstadoMensual');
    const añoEstadoMensual = document.getElementById('añoEstadoMensual');
    const mesEstadoMensual = document.getElementById('mesEstadoMensual');
    const sistemaAlimentacion = document.getElementById('sistemaAlimentacion');
    const mensaje = document.getElementById('mensaje');

    // Cargar clientes
    function cargarClientes() {
        fetch('/api/clientes')
            .then(response => response.json())
            .then(clientes => {
                [clienteSelect, clienteGestion, clienteEstadoMensual].forEach(select => {
                    select.innerHTML = '<option value="">Seleccione un cliente</option>';
                    clientes.forEach(cliente => {
                        const option = document.createElement('option');
                        option.value = cliente.ClienteID;
                        option.textContent = cliente.NombreCliente;
                        select.appendChild(option);
                    });
                });
            })
            .catch(error => {
                console.error('Error al cargar clientes:', error);
                mostrarMensaje('Error al cargar la lista de clientes');
            });
    }

    // Cargar años
    function cargarAños() {
        const currentYear = new Date().getFullYear();
        añoEstadoMensual.innerHTML = '<option value="">Seleccione un año</option>';
        for (let i = 0; i < 10; i++) {
            const year = currentYear + i;
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            añoEstadoMensual.appendChild(option);
        }
    }

    // Cargar sistemas de alimentación
    function cargarSistemasAlimentacion() {
        fetch('/api/sistemas-alimentacion')
            .then(response => response.json())
            .then(sistemas => {
                sistemaAlimentacion.innerHTML = '<option value="">Seleccione un sistema</option>';
                sistemas.forEach(sistema => {
                    const option = document.createElement('option');
                    option.value = sistema.SistemaID;
                    option.textContent = sistema.NombreSistema;
                    sistemaAlimentacion.appendChild(option);
                });
            })
            .catch(error => {
                console.error('Error al cargar sistemas de alimentación:', error);
                mostrarMensaje('Error al cargar la lista de sistemas de alimentación');
            });
    }

    // Añadir nuevo cliente
    document.getElementById('añadirCliente').addEventListener('click', function() {
        const nombreCliente = document.getElementById('nuevoClienteNombre').value;
        if (nombreCliente) {
            fetch('/api/clientes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ NombreCliente: nombreCliente })
            })
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    mostrarMensaje(data.error);
                } else {
                    mostrarMensaje(`Cliente ${nombreCliente} añadido con éxito`);
                    cargarClientes();
                    document.getElementById('nuevoClienteNombre').value = '';
                }
            })
            .catch(error => {
                console.error('Error al añadir cliente:', error);
                mostrarMensaje('Error al añadir el cliente');
            });
        }
    });

    // Añadir nuevo centro
    document.getElementById('añadirCentro').addEventListener('click', function() {
        const centro = {
            ClienteID: clienteSelect.value,
            NombreCentro: document.getElementById('nombreCentro').value,
            NombrePonton: document.getElementById('nombrePonton').value,
            SistemaID: sistemaAlimentacion.value,
            VersionSistema: document.getElementById('versionSistema').value,
            FechaInstalacionACA: document.getElementById('fechaInstalacionACA').value,
            FechaTermino: document.getElementById('fechaTermino').value || null
        };

        fetch('/api/centros', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(centro)
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                mostrarMensaje(data.error);
            } else {
                mostrarMensaje(`Centro ${data.NombreCentro} añadido con éxito`);
                // Limpiar formulario
                document.getElementById('centroForm').reset();
            }
        })
        .catch(error => {
            console.error('Error al añadir centro:', error);
            mostrarMensaje('Error al añadir el centro');
        });
    });

    // Cargar centros para gestión
    document.getElementById('cargarCentros').addEventListener('click', function() {
        const clienteId = clienteGestion.value;
        if (clienteId) {
            cargarCentros(clienteId);
        }
    });

    function cargarCentros(clienteId) {
        fetch(`/api/centros/${clienteId}`)
            .then(response => response.json())
            .then(centros => {
                const tabla = document.getElementById('centrosTabla');
                const tbody = tabla.querySelector('tbody');
                tbody.innerHTML = '';
                centros.forEach(centro => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${centro.NombreCentro}</td>
                        <td>${centro.NombrePonton}</td>
                        <td>${centro.NombreSistema}</td>
                        <td>${centro.VersionSistema}</td>
                        <td>${formatDate(centro.FechaInstalacionACA)}</td>
                        <td>${formatDate(centro.FechaTermino)}</td>
                        <td>
                            <button class="editar-centro" data-id="${centro.CentroID}">Editar</button>
                        </td>
                    `;
                    tbody.appendChild(tr);
                });
                tabla.style.display = 'table';
            })
            .catch(error => {
                console.error('Error al cargar centros:', error);
                mostrarMensaje('Error al cargar los centros');
            });
    }

    // Función para formatear fechas
    function formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toISOString().split('T')[0];
    }

    // Función para parsear fechas
    function parseDate(dateString) {
        return dateString;
    }

    // Modificar el evento de edición de centro
    document.getElementById('centrosTabla').addEventListener('click', function(e) {
        if (e.target.classList.contains('editar-centro')) {
            const centroId = e.target.dataset.id;
            const row = e.target.closest('tr');
            const cells = row.cells;

            cells[0].innerHTML = `<input type="text" value="${cells[0].textContent}">`;
            cells[1].innerHTML = `<input type="text" value="${cells[1].textContent}">`;
            
            const sistemaActual = cells[2].textContent;
            cells[2].innerHTML = sistemaAlimentacion.outerHTML;
            cells[2].querySelector('select').value = Array.from(cells[2].querySelector('select').options).find(option => option.text === sistemaActual)?.value || '';
            
            cells[3].innerHTML = `<input type="text" value="${cells[3].textContent}">`;
            cells[4].innerHTML = `<input type="date" value="${parseDate(cells[4].textContent)}">`;
            cells[5].innerHTML = `<input type="date" value="${parseDate(cells[5].textContent)}">`;
            
            e.target.textContent = 'Guardar';
            e.target.classList.remove('editar-centro');
            e.target.classList.add('guardar-centro');
        } else if (e.target.classList.contains('guardar-centro')) {
            const centroId = e.target.dataset.id;
            const row = e.target.closest('tr');
            const cells = row.cells;

            const centroActualizado = {
                CentroID: centroId,
                NombreCentro: cells[0].querySelector('input').value,
                NombrePonton: cells[1].querySelector('input').value,
                SistemaID: cells[2].querySelector('select').value,
                VersionSistema: cells[3].querySelector('input').value,
                FechaInstalacionACA: cells[4].querySelector('input').value || null,
                FechaTermino: cells[5].querySelector('input').value || null
            };

            fetch(`/api/centros/${centroId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(centroActualizado)
            })
            .then(response => response.json())
            .then(data => {
                mostrarMensaje(`Centro actualizado con éxito`);
                cells[0].textContent = centroActualizado.NombreCentro;
                cells[1].textContent = centroActualizado.NombrePonton;
                cells[2].textContent = cells[2].querySelector('select').options[cells[2].querySelector('select').selectedIndex].text;
                cells[3].textContent = centroActualizado.VersionSistema;
                cells[4].textContent = formatDate(centroActualizado.FechaInstalacionACA);
                cells[5].textContent = formatDate(centroActualizado.FechaTermino);

                e.target.textContent = 'Editar';
                e.target.classList.remove('guardar-centro');
                e.target.classList.add('editar-centro');
            })
            .catch(error => {
                console.error('Error al actualizar centro:', error);
                mostrarMensaje('Error al actualizar el centro');
            });
        }
    });

    // Cargar estado mensual
    document.getElementById('cargarEstadoMensual').addEventListener('click', function() {
        const clienteId = clienteEstadoMensual.value;
        const año = añoEstadoMensual.value;
        const mes = mesEstadoMensual.value;
        if (clienteId && año && mes) {
            fetch(`/api/estado-mensual?clienteId=${clienteId}&año=${año}&mes=${mes}`)
                .then(response => response.json())
                .then(estados => {
                    const tabla = document.getElementById('estadoMensualTabla');
                    const tbody = tabla.querySelector('tbody');
                    tbody.innerHTML = '';
                    estados.forEach(estado => {
                        const tr = document.createElement('tr');
                        tr.innerHTML = `
                            <td>${estado.NombreCentro}</td>
                            <td>${estado.NombrePonton}</td>
                            <td>${estado.NombreSistema}</td>
                            <td>${estado.VersionSistema}</td>
                            <td>${formatDate(estado.FechaInstalacionACA)}</td>
                            <td>${formatDate(estado.FechaTermino)}</td>
                            <td>
                                <select class="estado-select" data-centro-id="${estado.CentroID}">
                                    <option value="1" ${estado.EstadoID === 1 ? 'selected' : ''}>Integrando</option>
                                    <option value="2" ${estado.EstadoID === 2 ? 'selected' : ''}>No Integrando</option>
                                    <option value="3" ${estado.EstadoID === 3 ? 'selected' : ''}>Centro Vacío</option>
                                </select>
                            </td>
                            <td>
                                <input type="checkbox" class="analytics-check" data-centro-id="${estado.CentroID}" ${estado.CentroConAnalytics ? 'checked' : ''}>
                            </td>
                            <td>
                                <textarea class="comentarios" data-centro-id="${estado.CentroID}">${estado.Comentarios || ''}</textarea>
                            </td>
                        `;
                        tbody.appendChild(tr);
                    });
                    tabla.style.display = 'table';
                    document.getElementById('guardarEstadoMensual').style.display = 'block';
                })
                .catch(error => {
                    console.error('Error al cargar estado mensual:', error);
                    mostrarMensaje('Error al cargar el estado mensual');
                });
        }
    });

    // Guardar cambios en estado mensual
    document.getElementById('guardarEstadoMensual').addEventListener('click', function() {
        const clienteId = clienteEstadoMensual.value;
        const año = añoEstadoMensual.value;
        const mes = mesEstadoMensual.value;
        const estados = [];

        document.querySelectorAll('#estadoMensualTabla tbody tr').forEach(tr => {
            const centroId = tr.querySelector('.estado-select').dataset.centroId;
            estados.push({
                CentroID: centroId,
                Año: año,
                Mes: mes,
                EstadoID: tr.querySelector('.estado-select').value,
                CentroConAnalytics: tr.querySelector('.analytics-check').checked,
                Comentarios: tr.querySelector('.comentarios').value
            });
        });

        fetch('/api/estado-mensual', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(estados)
        })
        .then(response => response.json())
        .then(data => {
            mostrarMensaje('Estados mensuales actualizados con éxito');
        })
        .catch(error => {
            console.error('Error al guardar estados mensuales:', error);
            mostrarMensaje('Error al guardar los estados mensuales');
        });
    });

    // Función para mostrar mensajes
    function mostrarMensaje(texto) {
        mensaje.textContent = texto;
        mensaje.style.display = 'block';
        mensaje.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setTimeout(() => {
            mensaje.style.display = 'none';
        }, 5000);
    }

    // Inicialización
    cargarClientes();
    cargarAños();
    cargarSistemasAlimentacion();
});