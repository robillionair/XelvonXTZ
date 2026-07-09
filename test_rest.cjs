const { GoogleAuth } = require('google-auth-library');
async function test() {
  const auth = new GoogleAuth({
    scopes: 'https://www.googleapis.com/auth/cloud-platform'
  });
  const client = await auth.getClient();
  const projectId = 'cool-asset-36w9q';
  const dbId = 'ai-studio-xelvonxtz-6dc29486-fe85-4208-8cab-9ea502112ab5';
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${dbId}/documents/subscribers/test`;
  try {
    const res = await client.request({ url });
    console.log(res.data);
  } catch (err) {
    console.error(err.message);
  }
}
test();
