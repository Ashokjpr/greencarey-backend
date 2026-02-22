const BASE_URL = 'http://127.0.0.1:5000/api/contact';

async function runVerification() {
  console.log('Starting Contact API Verification...');

  try {
    // 1. Create a contact
    console.log('\n1. Creating a new contact...');
    const newContact = {
      name: 'Verification Bot',
      mobile: '1234567890',
      email: 'bot@verify.com',
      address: '123 Virtual St',
      service: 'Automated Testing',
    };
    
    let createRes;
    try {
        createRes = await fetch(BASE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newContact)
        });
    } catch (e) {
        console.error('Fetch failed:', e);
        if (e.cause) console.error('Cause:', e.cause);
        return;
    }
    
    if (!createRes.ok) {
        const errorText = await createRes.text();
        console.error(`❌ API Error (${createRes.status}):`, errorText);
        return;
    }

    const createData = await createRes.json();
    
    if (createData.success) {
        console.log('✅ Contact created successfully.');
    } else {
        console.error('❌ Failed to create contact:', createData);
        return;
    }

    if (!createData.data || !createData.data._id) {
         console.error('❌ Created contact data invalid:', createData);
         return;
    }

    const contactId = createData.data._id;
    console.log(`   ID: ${contactId}`);

    // 2. Get unread count
    console.log('\n2. Checking unread count...');
    const unreadRes = await fetch(`${BASE_URL}/unread`);
    const unreadData = await unreadRes.json();
    if (unreadData.success) {
        console.log(`✅ Unread count: ${unreadData.count}`);
    } else {
        console.error('❌ Failed to get unread count');
    }

    // 3. Get all contacts
    console.log('\n3. Fetching all contacts...');
    const getAllRes = await fetch(BASE_URL);
    const getAllData = await getAllRes.json();
    
    if (Array.isArray(getAllData.data)) {
        const found = getAllData.data.find(c => c._id === contactId);
        if (found) {
            console.log('✅ Created contact found in list.');
        } else {
            console.error('❌ Created contact NOT found in list.');
        }
    } else {
        console.error('❌ Get all contacts returned unexpected structure:', getAllData);
    }

    // 4. Mark as read
    console.log('\n4. Marking as read...');
    const markReadRes = await fetch(`${BASE_URL}/${contactId}/read`, { method: 'PATCH' });
    const markReadData = await markReadRes.json();
    
    if (markReadData.success && markReadData.data.read === true) {
        console.log('✅ Contact marked as read.');
    } else {
        console.error('❌ Failed to mark as read');
    }

    // 5. Check unread count again
    console.log('\n5. Checking unread count again...');
    const unreadRes2 = await fetch(`${BASE_URL}/unread`);
    const unreadData2 = await unreadRes2.json();
    console.log(`✅ Unread count: ${unreadData2.count}`);

    // 6. Delete contact
    console.log('\n6. Deleting contact...');
    const deleteRes = await fetch(`${BASE_URL}/${contactId}`, { method: 'DELETE' });
    const deleteData = await deleteRes.json();
    if (deleteData.success) {
        console.log('✅ Contact deleted successfully.');
    } else {
        console.error('❌ Failed to delete contact');
    }

    console.log('\n🎉 Verification Complete!');

  } catch (error) {
    console.error('\n❌ Verification Failed:', error.message);
    console.error(error.stack);
  }
}

runVerification();
