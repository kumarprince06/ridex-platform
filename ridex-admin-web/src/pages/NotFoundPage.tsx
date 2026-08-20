import { Link } from 'react-router-dom';

import { Card, PageHeader } from '../components/ui';

export function NotFoundPage() {
  return (
    <>
      <PageHeader title="That page does not exist" />
      <Card>
        <p>
          The link may be from an older version of the console. <Link to="/">Back to the dashboard</Link>.
        </p>
      </Card>
    </>
  );
}
