document.addEventListener('DOMContentLoaded', () => {
    const invoiceForm = document.getElementById('invoiceForm');
    const submitButton = document.getElementById('submitButton');
    const buttonText = document.getElementById('buttonText');
    const spinner = document.getElementById('spinner');
    const alertPlaceholder = document.getElementById('alertPlaceholder');

    invoiceForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Disabilita il pulsante e mostra lo spinner
        submitButton.disabled = true;
        buttonText.textContent = 'Creazione...';
        spinner.classList.remove('d-none');
        clearAlert();

        const formData = {
            nome: document.getElementById('nome').value,
            cognome: document.getElementById('cognome').value,
            codiceFiscale: document.getElementById('codiceFiscale').value,
            email: document.getElementById('email').value,
            importo: parseFloat(document.getElementById('importo').value),
            causale: document.getElementById('causale').value,
        };

        try {
            const response = await fetch('/.netlify/functions/create-invoice', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Si è verificato un errore sconosciuto.');
            }

            showAlert('Fattura creata con successo! Numero: ' + result.invoiceNumber, 'success');
            invoiceForm.reset();

        } catch (error) {
            showAlert(error.message, 'danger');
        } finally {
            // Riabilita il pulsante e nasconde lo spinner
            submitButton.disabled = false;
            buttonText.textContent = 'Crea Fattura';
            spinner.classList.add('d-none');
        }
    });

    function showAlert(message, type) {
        const wrapper = document.createElement('div');
        wrapper.innerHTML = [
            `<div class="alert alert-${type} alert-dismissible" role="alert">`,
            `   <div>${message}</div>`,
            '   <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>',
            '</div>'
        ].join('');

        alertPlaceholder.append(wrapper);
    }

    function clearAlert() {
        alertPlaceholder.innerHTML = '';
    }
});
