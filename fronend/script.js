// =====================================================
// API URL
// =====================================================

const API_BASE_URL = "https://clientflow-backend-py6m.onrender.com";


// =====================================================
// FORM ELEMENTS
// =====================================================

const clientForm = document.getElementById("clientForm");
const messageBox = document.getElementById("message");


// =====================================================
// HELPER - SHOW MESSAGE
// =====================================================

function showMessage(message, type) {
    if (!messageBox) {
        return;
    }

    messageBox.textContent = message;
    messageBox.className = `message ${type}`;
}


// =====================================================
// FORM SUBMIT
// =====================================================

if (clientForm) {

    clientForm.addEventListener("submit", async function (event) {

        event.preventDefault();
        event.stopPropagation();

        showMessage("", "");

        const clientData = {
            portal_id: document.getElementById("portal_id").value.trim(),
            first_name: document.getElementById("first_name").value.trim(),
            last_name: document.getElementById("last_name").value.trim(),
            address: document.getElementById("address").value.trim(),
            street: document.getElementById("street").value.trim(),
            region: document.getElementById("region").value.trim(),
            postal_code: document.getElementById("postal_code").value.trim(),
            phone_number: document.getElementById("phone_number").value.trim()
        };

        const emptyField = Object.values(clientData).some(value => value === "");

        if (emptyField) {
            showMessage("Please fill all required fields.", "error");
            return;
        }

        const portalIdPattern = /^[A-Za-z0-9_-]+$/;
        const textPattern = /^[A-Za-z ]+$/;
        const streetPattern = /^[A-Za-z0-9\s\/.,'-]+$/;
        const postalCodePattern = /^[0-9]{6}$/;
        const phonePattern = /^[0-9]{10}$/;

        if (!portalIdPattern.test(clientData.portal_id)) {
            showMessage("Portal ID can contain only letters, numbers, underscore and hyphen.", "error");
            return;
        }

        const textFields = [
            clientData.first_name,
            clientData.last_name,
            clientData.address,
            clientData.region
        ];

        const invalidTextField = textFields.some(value => !textPattern.test(value));

        if (invalidTextField) {
            showMessage("First Name, Last Name, Address and Region can contain only alphabets and spaces.", "error");
            return;
        }

        if (!streetPattern.test(clientData.street)) {
            showMessage("Street can contain letters, numbers, spaces, slash, comma, dot, hyphen and apostrophe only.", "error");
            return;
        }

        if (!postalCodePattern.test(clientData.postal_code)) {
            showMessage("Postal code must contain exactly 6 numbers.", "error");
            return;
        }

        if (!phonePattern.test(clientData.phone_number)) {
            showMessage("Phone number must contain exactly 10 digits.", "error");
            return;
        }

        const submitButton = clientForm.querySelector(".submit-button");

        if (submitButton) {
            submitButton.disabled = true;
            submitButton.innerHTML = "<span>Submitting...</span>";
        }

        try {
            const response = await fetch(`${API_BASE_URL}/add-client`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(clientData)
            });

            const result = await response.json();

            if (!response.ok) {
                let errorMessage = "Something went wrong";

                if (Array.isArray(result.detail)) {
                    errorMessage = result.detail.map(error => error.msg).join(", ");
                } else if (result.detail) {
                    errorMessage = result.detail;
                }

                throw new Error(errorMessage);
            }

            if (result.success === false) {
                throw new Error(result.message || "Failed to save client");
            }

            showMessage(`${result.message} at ${result.created_at}`, "success");

            clientForm.reset();

        } catch (error) {
            console.error("Submit Error:", error);
            showMessage(error.message || "Unable to connect to server.", "error");

        } finally {
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.innerHTML =
                    "<span>Submit Client Details</span>" +
                    "<span class='button-arrow'>→</span>";
            }
        }

    });

}