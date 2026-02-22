// Native fetch is available in Node 18+

const BASE_URL = 'http://localhost:5000/api/blogs';

async function verifyBlogAPI() {
  console.log('--- Starting Blog API Verification ---');

  // 1. Create a Blog
  console.log('\nTRy 1: Create a Blog...');
  const newBlog = {
    title: 'Test Blog Title',
    slug: 'test-blog-title',
    description: 'This is a short description for the test blog.',
    content: '<h1>Hello World</h1><p>This is rich text content.</p>',
    image: 'http://example.com/image.jpg',
    isPublished: true,
    seoTitle: 'Test Blog SEO Title',
    seoDescription: 'Test Blog SEO Description',
    seoKeywords: 'test, blog, seo'
  };

  let createdBlogId = null;

  try {
    const createRes = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newBlog)
    });
    const createData = await createRes.json();
    
    if (createRes.ok && createData.success) {
      console.log('NO 1: PASSED. Blog created:', createData.data.title);
      createdBlogId = createData.data._id;
    } else {
      console.error('NO 1: FAILED.', createData);
      return;
    }
  } catch (err) {
    console.error('NO 1: FAILED with error:', err.message);
    return;
  }

  // 2. Get All Blogs
  console.log('\nTRy 2: Get All Blogs...');
  try {
    const getAllRes = await fetch(BASE_URL);
    const getAllData = await getAllRes.json();

    if (getAllRes.ok && getAllData.success) {
      console.log(`NO 2: PASSED. Found ${getAllData.count} blogs.`);
    } else {
      console.error('NO 2: FAILED.', getAllData);
    }
  } catch (err) {
    console.error('NO 2: FAILED with error:', err.message);
  }

  // 3. Get Single Blog by ID
  console.log('\nTRy 3: Get Blog by ID...');
  try {
    const getByIdRes = await fetch(`${BASE_URL}/${createdBlogId}`);
    const getByIdData = await getByIdRes.json();

    if (getByIdRes.ok && getByIdData.success) {
        console.log('NO 3: PASSED. Retrieved blog:', getByIdData.data.title);
    } else {
        console.error('NO 3: FAILED.', getByIdData);
    }
  } catch (err) {
    console.error('NO 3: FAILED with error:', err.message);
  }

  // 4. Update Blog
  console.log('\nTRy 4: Update Blog...');
  try {
    const updateRes = await fetch(`${BASE_URL}/${createdBlogId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Updated Blog Title', seoTitle: 'Updated SEO Title' })
    });
    const updateData = await updateRes.json();

    if (updateRes.ok && updateData.success) {
        console.log('NO 4: PASSED. Blog updated:', updateData.data.title);
    } else {
        console.error('NO 4: FAILED.', updateData);
    }
  } catch (err) {
    console.error('NO 4: FAILED with error:', err.message);
  }

  // 5. Delete Blog
  console.log('\nTRy 5: Delete Blog...');
  try {
    const deleteRes = await fetch(`${BASE_URL}/${createdBlogId}`, {
        method: 'DELETE'
    });
    const deleteData = await deleteRes.json();

    if (deleteRes.ok && deleteData.success) {
        console.log('NO 5: PASSED. Blog deleted.');
    } else {
        console.error('NO 5: FAILED.', deleteData);
    }
  } catch (err) {
    console.error('NO 5: FAILED with error:', err.message);
  }

  console.log('\n--- Blog API Verification Completed ---');
}

verifyBlogAPI();
